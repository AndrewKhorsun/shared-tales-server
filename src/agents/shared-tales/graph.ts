// src/agents/shared-tales/graph.ts

import { StateGraph, START, END } from "@langchain/langgraph";
import { ChapterState } from "./state";
import { checkpointer } from "../checkpointer";
import { plannerInterruptNode, plannerNode } from "./nodes/planner";
import { writerNode } from "./nodes/writer";
import { editorNode } from "./nodes/editor";
import { summarizerNode } from "./nodes/summarizer";

function editorRouter(state: typeof ChapterState.State): "writer" | "summarizer" {
  if (state.editor_approved) {
    console.log("[graph] editor → summarizer (approved)");
    return "summarizer";
  }
  if (state.write_attempts >= 3) {
    console.log("[graph] editor → summarizer (max attempts)");
    return "summarizer";
  }
  console.log(`[graph] editor → writer (attempt ${state.write_attempts + 1})`);
  return "writer";
}

export const chapterGraph = new StateGraph(ChapterState)
  .addNode("planner", plannerNode)
  .addNode("planner_interrupt", plannerInterruptNode)
  .addNode("writer", writerNode)
  .addNode("editor", editorNode)
  .addNode("summarizer", summarizerNode)
  .addEdge(START, "planner")
  .addEdge("planner", "planner_interrupt")
  .addEdge("planner_interrupt", "writer")
  .addEdge("writer", "editor")
  .addConditionalEdges("editor", editorRouter, {
    writer: "writer",
    summarizer: "summarizer",
  })
  .addEdge("summarizer", END)
  .compile({ checkpointer });
