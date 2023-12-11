"use client";

import { useCallback } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Node,
  MiniMap,
  Edge,
  OnConnect,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import * as nodeTypes from "./custom-nodes";

import "reactflow/dist/style.css";
import DownloadImage from "./download-image";

export const Zodflow: React.FC<{
  initialNodes: Node[];
  initialEdges: Edge[];
}> = ({ initialNodes, initialEdges }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    >
      <DownloadImage />
      <Controls />
      <MiniMap />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
};
