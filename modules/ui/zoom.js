import { select as d3_select } from 'd3-selection';

import { uiIcon } from './icon';
import { uiCmd } from './cmd';
import { uiTooltip } from './tooltip';
import { utilKeybinding } from '../util/keybinding';


export function uiZoom(context) {
  const l10n = context.systems.l10n;

  const zooms = [{
    id: 'zoom-in',
    icon: 'rapid-icon-plus',
    title: l10n.t('zoom.in'),
    action: zoomIn,
    isDisabled: () => !context.systems.map.canZoomIn(),
    disabledTitle: l10n.t('zoom.disabled.in'),
    key: '+'
  }, {
    id: 'zoom-out',
    icon: 'rapid-icon-minus',
    title: l10n.t('zoom.out'),
    action: zoomOut,
    isDisabled: () => !context.systems.map.canZoomOut(),
    disabledTitle: l10n.t('zoom.disabled.out'),
    key: '-'
  }];

  function zoomIn(d3_event) {
    if (d3_event.shiftKey) return;
    d3_event.preventDefault();
    context.systems.map.zoomIn();
  }

  function zoomOut(d3_event) {
    if (d3_event.shiftKey) return;
    d3_event.preventDefault();
    context.systems.map.zoomOut();
  }

  function zoomInFurther(d3_event) {
    if (d3_event.shiftKey) return;
    d3_event.preventDefault();
    context.systems.map.zoomInFurther();
  }

  function zoomOutFurther(d3_event) {
    if (d3_event.shiftKey) return;
    d3_event.preventDefault();
    context.systems.map.zoomOutFurther();
  }

  return function render(selection) {
    let tooltipBehavior = uiTooltip(context)
      .placement(l10n.isRTL() ? 'right' : 'left')
      .title(d => d.isDisabled() ? d.disabledTitle : d.title)
      .keys(d => [d.key]);

    let _lastPointerUpType;

    let buttons = selection.selectAll('button')
      .data(zooms)
      .enter()
      .append('button')
      .attr('class', d => d.id)
      .on('pointerup', d3_event => _lastPointerUpType = d3_event.pointerType)
      .on('click', (d3_event, d) => {
        if (!d.isDisabled()) {
          d.action(d3_event);
        } else if (_lastPointerUpType === 'touch' || _lastPointerUpType === 'pen') {
          context.systems.ui.flash
            .duration(2000)
            .iconName(`#${d.icon}`)
            .iconClass('disabled')
            .label(d.disabledTitle)();
        }
        _lastPointerUpType = null;
      })
      .call(tooltipBehavior);

    buttons.each((d, i, nodes) => {
      d3_select(nodes[i])
        .call(uiIcon(`#${d.icon}`, 'light'));
    });

    utilKeybinding.plusKeys.forEach(key => {
      context.keybinding().on([key], zoomIn);
      context.keybinding().on([uiCmd('⌥' + key)], zoomInFurther);
    });

    utilKeybinding.minusKeys.forEach(key => {
      context.keybinding().on([key], zoomOut);
      context.keybinding().on([uiCmd('⌥' + key)], zoomOutFurther);
    });

    function updateButtonStates() {
      buttons
        .classed('disabled', d => d.isDisabled())
        .each((d, i, nodes) => {
          const selection = d3_select(nodes[i]);
          if (!selection.select('.tooltip.in').empty()) {
            selection.call(tooltipBehavior.updateContent);
          }
        });
    }

    updateButtonStates();

    context.systems.map.on('draw', updateButtonStates);
  };
}
