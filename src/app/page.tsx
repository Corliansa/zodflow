"use client";

import { ZodEnumNode, ZodObjectNode } from "@/components/renderer";
import React, { useCallback } from "react";
import * as examples from "@/utils/examples";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  OnConnect,
} from "reactflow";

import "reactflow/dist/style.css";
import { getInitialData } from "@/utils/zodHelpers";

const nodeTypes = { zodObjectNode: ZodObjectNode, zodEnumNode: ZodEnumNode };

const { nodes: initialNodes, edges: initialEdges } = getInitialData(
  examples.MasterSchema,
  examples
);

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
