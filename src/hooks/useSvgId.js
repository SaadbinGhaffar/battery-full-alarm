import { useId } from 'react';

/**
 * A unique, url()-safe id for SVG defs (gradients, patterns, clip paths), so
 * several instances of a component can be mounted at once without collisions.
 */
export function useSvgId(prefix) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}
