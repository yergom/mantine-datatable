import { RefObject, useEffect } from 'react';
import { VAR_FOOTER_HEIGHT, VAR_HEADER_HEIGHT } from '../cssVariables';

interface UseDataTableInjectCssVariablesOpts {
  root: RefObject<HTMLDivElement | null>;
  table: RefObject<HTMLTableElement | null>;
  header: RefObject<HTMLTableSectionElement | null>;
  footer: RefObject<HTMLTableSectionElement | null>;
  selectionColumn: RefObject<HTMLTableCellElement | null>;
}

/**
 * The idea is that we are going to inject CSS variables into the root, so that they can be used in css stylings for the different table section,
 * without causing a reeact re-render
 */
type Rect = {
  width: number;
  height: number;
};

function setCssVar(root: HTMLDivElement | null, name: string, value: string) {
  root?.style.setProperty(name, value);
}

function observe(elem: HTMLElement | null, onChange: (rect: Rect) => unknown, onCancel: () => unknown) {
  if (elem) {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const boxSize = entry.borderBoxSize?.[0] || entry.contentBoxSize?.[0];
        if (boxSize) {
          onChange({
            width: boxSize.inlineSize,
            height: boxSize.blockSize,
          });
        } else {
          onChange(entry.contentRect);
        }
      }
    });
    observer.observe(elem);
    return () => {
      observer.disconnect();
      onCancel();
    };
  }
}

export function useDataTableInjectCssVariables(opts: UseDataTableInjectCssVariablesOpts) {
  useEffect(() => {
    return observe(
      opts.header.current,
      (rect) => {
        setCssVar(opts.root.current, VAR_HEADER_HEIGHT, `${rect.height}px`);
      },
      () => setCssVar(opts.root.current, VAR_HEADER_HEIGHT, "0px")
    );
  }, [opts.header.current]);

  useEffect(() => {
    return observe(
      opts.footer.current,
      (rect) => {
        setCssVar(opts.root.current, VAR_FOOTER_HEIGHT, `${rect.height}px`);
      },
      () => setCssVar(opts.root.current, VAR_FOOTER_HEIGHT, "0px")
    );
  }, [opts.footer.current]);
}
