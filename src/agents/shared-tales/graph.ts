// src/agents/shared-tales/graph.ts

import { StateGraph, START, END } from "@langchain/langgraph";
import { ChapterState } from "./state";
import { checkpointer } from "../checkpointer";
import { plannerNode } from "./nodes/planner";
import { writerNode } from "./nodes/writer";
import { editorNode } from "./nodes/editor";
import { summarizerNode } from "./nodes/summarizer";

function editorRouter(state: typeof ChapterState.State): "writer" | "summarizer" {
  if (state.editor_approved) return "summarizer";
  if (state.write_attempts >= 3) return "summarizer";
  return "writer";
}

export const chapterGraph = new StateGraph(ChapterState)
  .addNode("planner", plannerNode)
  .addNode("writer", writerNode)
  .addNode("editor", editorNode)
  .addNode("summarizer", summarizerNode)
  .addEdge(START, "planner")
  .addEdge("planner", "writer")
  .addEdge("writer", "editor")
  .addConditionalEdges("editor", editorRouter, {
    writer: "writer",
    summarizer: "summarizer",
  })
  .addEdge("summarizer", END)
  .compile({ checkpointer });
