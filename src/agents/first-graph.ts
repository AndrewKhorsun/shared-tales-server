import { StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { checkpointer, setupCheckpointer } from "./checkpointer";
import { config } from "../config";

const llm = new ChatAnthropic({
  apiKey: config.llm.anthropicKey,
  model: "claude-haiku-4-5",
});

const BookState = Annotation.Root({
  plan: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  draft: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  approved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  attempts: Annotation<number>({
    reducer: (current, next) => current + next,
    default: () => 0,
  }),
  userFeedback: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  planApproved: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

async function plannerNode(state: typeof BookState.State) {
  const isReplanning = !!state.userFeedback;
  console.log(
    "\n--- [Step 1: Plan] " +
      (isReplanning ? "Replanning based on user feedback..." : "Generating initial plan...")
  );

  const prompt = state.userFeedback
    ? `Create a short plan from three steps for the first chapter of a LitRPG urban fantasy book.
       Previous feedback from user: ${state.userFeedback}
       Please adjust the plan based on this feedback.`
    : "Create a short plan from three steps for the first chapter of a LitRPG urban fantasy book.";

  const response = await llm.invoke(prompt);
  const plan = response.content as string;

  console.log("    -> Plan generated. Waiting for user approval...");

  if (!state.planApproved) {
    interrupt({ plan });
  }
  return {
    plan,
    userFeedback: null,
  };
}

function planRouterFunction(state: typeof BookState.State): "writer" | "planner" {
  if (state.planApproved) {
    console.log("    -> Plan approved by user. Moving to writing...");
    return "writer";
  }
  console.log("    -> Plan rejected by user. Going back to replanning...");
  return "planner";
}

async function writerNode(state: typeof BookState.State) {
  console.log("\n--- [Step 2: Write] Writing draft based on approved plan...");

  const response = await llm.invoke(`Write a brief draft based on the ${state.plan}`);

  console.log("    -> Draft written. Sending to editor...");
  return {
    draft: response.content as string,
  };
}

async function editorNode(state: typeof BookState.State) {
  console.log("\n--- [Step 3: Edit] Reviewing draft (attempt " + (state.attempts + 1) + "/3)...");

  const response = await llm.invoke(
    `You are a strict book editor. Review this draft and respond with ONLY a JSON object, nothing else:

    Draft: ${state.draft}

    Respond with exactly this format:
    {"approved": true, "feedback": "your feedback here"}`
  );

  const raw = (response.content as string)
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(raw);

  console.log("    -> Decision: " + (parsed.approved ? "APPROVED" : "REJECTED"));

  return {
    approved: parsed.approved as boolean,
    attempts: 1,
  };
}
function routerFunction(state: typeof BookState.State): "end" | "planner" {
  if (state.approved) {
    console.log("    -> Draft approved! Finishing.");
    return "end";
  }

  if (state.attempts >= 3) {
    console.log("    -> Max attempts (3) reached. Finishing with current draft.");
    return "end";
  }

  console.log("    -> Draft rejected. Going back to planner (attempt " + state.attempts + "/3)...");
  return "planner";
}

const graph = new StateGraph(BookState)
  .addNode("planner", plannerNode)
  .addNode("writer", writerNode)
  .addNode("editor", editorNode)
  .addEdge(START, "planner")
  .addConditionalEdges("planner", planRouterFunction, {
    writer: "writer",
    planner: "planner",
  })
  .addEdge("writer", "editor")
  .addConditionalEdges("editor", routerFunction, {
    planner: "planner",
    end: END,
  })
  .compile({
    checkpointer,
  });

async function main() {
  await setupCheckpointer();

  const threadId = "session-005"; // тот же thread_id!

  console.log("=== Run 2: Continuing from checkpoint ===");

  const stateBefore = await graph.getState({
    configurable: { thread_id: threadId },
  });

  console.log("Resuming from:", stateBefore.next);

  await graph.invoke({ planApproved: true }, { configurable: { thread_id: threadId } });

  const stateAfter = await graph.getState({
    configurable: { thread_id: threadId },
  });

  console.log("Has plan:", !!stateAfter.values.plan);
  console.log("Has draft:", !!stateAfter.values.draft);
  console.log("Approved:", stateAfter.values.approved);
}

main();
