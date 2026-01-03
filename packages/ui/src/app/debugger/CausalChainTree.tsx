import React from 'react';
import type { CausalChain, CausalNode, CausalNodeType } from '@orbisreport/core';

/**
 * Causal Chain Tree - Left Column Component
 *
 * Vertical list with icons by node type
 * Failure node pinned at top
 * Selecting node updates center/right panels (no navigation)
 */
export interface CausalChainTreeProps {
  causalChain: CausalChain;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}

export function CausalChainTree({
  causalChain,
  selectedNodeId,
  onNodeSelect,
  onNodeHover
}: CausalChainTreeProps): JSX.Element {
  // Separate failure node (always first) from other nodes
  const failureNode = causalChain.nodes.find(node => node.type === 'failure');
  const otherNodes = causalChain.nodes.filter(node => node.type !== 'failure');

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect(nodeId);
  };

  const handleNodeHover = (nodeId: string | null) => {
    onNodeHover?.(nodeId);
  };

  return (
    <div className="causal-chain-tree">
      <div className="causal-chain-tree__header">
        <h3>Causal Chain</h3>
        <span className="causal-chain-tree__count">{causalChain.nodes.length} layers</span>
      </div>

      <div className="causal-chain-tree__content">
        {/* Failure node always at top */}
        {failureNode && (
          <CausalTreeNode
            node={failureNode}
            isSelected={selectedNodeId === failureNode.id}
            onClick={() => handleNodeClick(failureNode.id)}
            onHover={(hovering) => handleNodeHover(hovering ? failureNode.id : null)}
          />
        )}

        {/* Other nodes in effect → cause order */}
        {otherNodes.map((node) => (
          <CausalTreeNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onClick={() => handleNodeClick(node.id)}
            onHover={(hovering) => handleNodeHover(hovering ? node.id : null)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual causal chain tree node
 */
interface CausalTreeNodeProps {
  node: CausalNode;
  isSelected: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

function CausalTreeNode({ node, isSelected, onClick, onHover }: CausalTreeNodeProps): JSX.Element {
  const handleMouseEnter = () => onHover(true);
  const handleMouseLeave = () => onHover(false);

  return (
    <div
      className={`causal-tree-node ${isSelected ? 'causal-tree-node--selected' : ''}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="causal-tree-node__icon">
        <NodeTypeIcon type={node.type} />
      </div>

      <div className="causal-tree-node__content">
        <div className="causal-tree-node__title">{node.title}</div>
        {node.subtitle && (
          <div className="causal-tree-node__subtitle">{node.subtitle}</div>
        )}
      </div>

      <div className="causal-tree-node__arrow">
        {node.type !== 'failure' && <span>→</span>}
      </div>
    </div>
  );
}

/**
 * Icon component for different node types
 */
function NodeTypeIcon({ type }: { type: CausalNodeType }): JSX.Element {
  const iconClass = `causal-tree-node__icon-${type}`;

  return (
    <div className={`causal-tree-node__icon-base ${iconClass}`}>
      {/* Icons are represented by CSS background colors/shapes */}
    </div>
  );
}
