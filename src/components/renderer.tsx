import {
  hasHandle,
  isZodFirstPartyTypeKind,
  renderType,
} from "@/utils/zodHelpers";
import { Handle, NodeProps, Position } from "reactflow";

export type ZodObjectNodeData = {
  label: string;
  schema: Record<string, string>;
};

export function ZodObjectNode({
  data,
  isConnectable,
}: NodeProps<ZodObjectNodeData>) {
  return (
    <div className="bg-slate-50 rounded-md">
      <div className="text-center bg-slate-100 p-2 rounded-sm">
        {data.label}
      </div>
      <div className="p-2">
        {Object.entries(data.schema).map(([key, type], index) => (
          <div key={key} className="flex gap-4 justify-between">
            <div>{key}</div>
            <div className="font-semibold">{renderType(type)}</div>
            {hasHandle(type) && (
              <Handle
                key={key}
                type="source"
                id={key}
                isConnectable={isConnectable}
                position={Position.Right}
                style={{ top: 60 + index * 24 }}
              />
            )}
          </div>
        ))}
      </div>
      <Handle
        type="target"
        isConnectable={isConnectable}
        position={Position.Left}
        style={{ top: 20 }}
      />
    </div>
  );
}

export type ZodEnumNodeData = {
  label: string;
  items: string[];
};

export function ZodEnumNode({
  data,
  isConnectable,
}: NodeProps<ZodEnumNodeData>) {
  return (
    <div className="bg-slate-50 rounded-md">
      <div className="text-center bg-slate-100 p-2 rounded-sm">
        {data.label}
      </div>
      <div className="p-2">
        <ul>
          {data.items.map((item) => (
            <li key={item} className="text-center">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <Handle
        type="target"
        isConnectable={isConnectable}
        position={Position.Left}
        style={{ top: 20 }}
      />
    </div>
  );
}
