import { Extent } from '@rapid-sdk/math';


/**
 * utilTotalExtent
 * Returns an `Extent` that contains all of the given Entities or entityIDs.
 * @param   {Array|Set}  vals - Entities -or- EntityIDs
 * @return  {Extent}     Total Extent that contains the given Entities
 */
export function utilTotalExtent(vals, graph) {
  const extent = new Extent();

  for (const val of vals) {
    const entity = (typeof val === 'string' ? graph.hasEntity(val) : val);
    if (entity) {
      const other = entity.extent(graph);
      // update extent in place
      extent.min = [ Math.min(extent.min[0], other.min[0]), Math.min(extent.min[1], other.min[1]) ];
      extent.max = [ Math.max(extent.max[0], other.max[0]), Math.max(extent.max[1], other.max[1]) ];
    }
  }

  return extent;
}


// Adds or removes highlight styling for the specified entities
export function utilHighlightEntities(entityIDs, highlighted, context) {
  const editor = context.systems.editor;
  const map = context.systems.map;
  const scene = map.scene;
  if (!scene) return;  // called too soon?

  if (highlighted) {
    for (const entityID of entityIDs) {
      scene.classData('osm', entityID, 'highlighted');

      // When highlighting a relation, try to highlight its members.
      if (entityID[0] === 'r') {
        const relation = editor.staging.graph.hasEntity(entityID);
        if (!relation) continue;
        for (const member of relation.members) {
          scene.classData('osm', member.id, 'highlighted');
        }
      }
    }

  } else {
    scene.clearClass('highlighted');
  }

  map.immediateRedraw();
}


// Returns whether value looks like a valid color we can display
export function utilIsColorValid(value) {
  // OSM only supports hex or named colors
  if (!value.match(/^(#([0-9a-fA-F]{3}){1,2}|\w+)$/)) {
    return false;
  }
  // see https://stackoverflow.com/a/68217760/1627467
  if (!CSS.supports('color', value) || ['unset', 'inherit', 'initial', 'revert'].includes(value)) {
    return false;
  }

  return true;
}


// `utilSetTransform`
// Applies a CSS transformation to the given selection
export function utilSetTransform(selection, x, y, scale, rotate) {
  const t = `translate3d(${x}px,${y}px,0)`;
  const s = scale ? ` scale(${scale})` : '';
  const r = rotate ? ` rotate(${rotate}deg)` : '';
  return selection.style('transform', `${t}${s}${r}`);
}


// a d3.mouse-alike which
// 1. Only works on HTML elements, not SVG
// 2. Does not cause style recalculation
export function utilFastMouse(container) {
  const rect = container.getBoundingClientRect();
  const rectLeft = rect.left;
  const rectTop = rect.top;
  const clientLeft = +container.clientLeft;
  const clientTop = +container.clientTop;
  return function(e) {
    return [
      e.clientX - rectLeft - clientLeft,
      e.clientY - rectTop - clientTop
    ];
  };
}


/**
 * utilWrap
 * Wraps an index to an interval [0..max-1]
 * (Essentially modulo/remainder that works for negative numbers also)
 * @param   {number}  index
 * @param   {number}  max
 * @return  {number}  result
 */
export function utilWrap(index, max) {
  if (index < 0) {
    index += Math.ceil(-index / max) * max;
  }
  return index % max;
}


/**
 * utilFunctor
 * A functor is just a way of turning anything into a function.
 * This is particulary useful in places where D3 wants a function to be.
 * If passed a function, it returns that function.
 * If passed a value, it returns a function that returns that value.
 * @param   {*} value any value
 * @return  {Function} a function that returns that value or the value if it's a function
 */
export function utilFunctor(value) {
  return (typeof value === 'function') ? value : (() => value);
}


/**
 * utilNoAuto
 * Sets common attributes on `<input>` or `<textarea>` elements to avoid autocomplete and other annoyances.
 * @param   {d3-selection} selection - A d3-selection to a `<input>` or `<textarea>`
 * @return  {d3-selection} same selection but with the attributes set
 */
export function utilNoAuto(selection) {
  const isText = (selection.size() && selection.node().tagName.toLowerCase() === 'textarea');

  // assign 'new-password' even for non-password fields to prevent browsers (Chrome) ignoring 'off'
  // https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion

  return selection
    .attr('autocomplete', 'new-password')
    .attr('autocorrect', 'off')
    .attr('autocapitalize', 'off')
    .attr('data-1p-ignore', '')      // Rapid#1085
    .attr('data-lpignore', 'true')   // Rapid#1085
    .attr('spellcheck', isText ? 'true' : 'false');
}
