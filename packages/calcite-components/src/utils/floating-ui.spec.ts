import { waitForAnimationFrame } from "../tests/utils";
import * as floatingUI from "./floating-ui";
import { FloatingUIComponent } from "./floating-ui";

const {
  cleanupMap,
  connectFloatingUI,
  defaultOffsetDistance,
  disconnectFloatingUI,
  effectivePlacements,
  filterComputedPlacements,
  getEffectivePlacement,
  placements,
  positionFloatingUI,
  reposition,
  repositionDebounceTimeout
} = floatingUI;

import * as floatingUIDOM from "@floating-ui/dom";

(floatingUIDOM as any).computePosition = async (_: HTMLElement, floatingEl: HTMLElement) => {
  floatingEl.style.transform = "some value";
  floatingEl.style.top = "0";
  floatingEl.style.left = "0";

  return {
    x: 0,
    y: 0,
    placement: "bottom",
    strategy: "absolute",
    middlewareData: {}
  };
};

it("should set calcite placement to FloatingUI placement", () => {
  const el = document.createElement("div");

  expect(getEffectivePlacement(el, "leading")).toBe("left");
  expect(getEffectivePlacement(el, "leading-start")).toBe("left-start");
  expect(getEffectivePlacement(el, "leading-end")).toBe("left-end");
  expect(getEffectivePlacement(el, "trailing")).toBe("right");
  expect(getEffectivePlacement(el, "trailing-start")).toBe("right-start");
  expect(getEffectivePlacement(el, "trailing-end")).toBe("right-end");

  el.dir = "rtl";

  expect(getEffectivePlacement(el, "leading")).toBe("right");
  expect(getEffectivePlacement(el, "leading-start")).toBe("right-start");
  expect(getEffectivePlacement(el, "leading-end")).toBe("right-end");
  expect(getEffectivePlacement(el, "trailing")).toBe("left");
  expect(getEffectivePlacement(el, "trailing-start")).toBe("left-start");
  expect(getEffectivePlacement(el, "trailing-end")).toBe("left-end");
});

describe("repositioning", () => {
  let fakeFloatingUiComponent: FloatingUIComponent;
  let floatingEl: HTMLDivElement;
  let referenceEl: HTMLButtonElement;
  let positionOptions: Parameters<typeof positionFloatingUI>[1];

  function createFakeFloatingUiComponent(): FloatingUIComponent {
    return {
      open: false,
      reposition: async () => {
        /* noop */
      },
      overlayPositioning: "absolute",
      placement: "auto"
    };
  }

  beforeEach(() => {
    fakeFloatingUiComponent = createFakeFloatingUiComponent();

    floatingEl = document.createElement("div");
    referenceEl = document.createElement("button");

    positionOptions = {
      floatingEl,
      referenceEl,
      overlayPositioning: fakeFloatingUiComponent.overlayPositioning,
      placement: fakeFloatingUiComponent.placement,
      type: "popover"
    };
  });

  function assertPreOpenPositionining(floatingEl: HTMLElement): void {
    expect(floatingEl.style.transform).toBe("");
    expect(floatingEl.style.top).toBe("");
    expect(floatingEl.style.left).toBe("");
  }

  function assertOpenPositionining(floatingEl: HTMLElement): void {
    expect(floatingEl.style.transform).not.toBe("");
    expect(floatingEl.style.top).toBe("0");
    expect(floatingEl.style.left).toBe("0");
  }

  it("repositions only for open components", async () => {
    await reposition(fakeFloatingUiComponent, positionOptions);
    assertPreOpenPositionining(floatingEl);

    fakeFloatingUiComponent.open = true;

    await reposition(fakeFloatingUiComponent, positionOptions);
    assertOpenPositionining(floatingEl);
  });

  it("repositions immediately by default", async () => {
    fakeFloatingUiComponent.open = true;

    reposition(fakeFloatingUiComponent, positionOptions);

    assertPreOpenPositionining(floatingEl);

    await waitForAnimationFrame();
    assertOpenPositionining(floatingEl);
  });

  it("can reposition after a delay", async () => {
    fakeFloatingUiComponent.open = true;

    reposition(fakeFloatingUiComponent, positionOptions, true);

    assertPreOpenPositionining(floatingEl);

    await new Promise<void>((resolve) => setTimeout(resolve, repositionDebounceTimeout));
    assertOpenPositionining(floatingEl);
  });

  describe("connect/disconnect helpers", () => {
    it("has connectedCallback and disconnectedCallback helpers", () => {
      expect(cleanupMap.has(fakeFloatingUiComponent)).toBe(false);
      expect(floatingEl.style.position).toBe("");
      expect(floatingEl.style.visibility).toBe("");
      expect(floatingEl.style.pointerEvents).toBe("");

      connectFloatingUI(fakeFloatingUiComponent, referenceEl, floatingEl);

      expect(cleanupMap.has(fakeFloatingUiComponent)).toBe(true);
      expect(floatingEl.style.position).toBe("absolute");
      expect(floatingEl.style.visibility).toBe("hidden");
      expect(floatingEl.style.pointerEvents).toBe("none");

      disconnectFloatingUI(fakeFloatingUiComponent, referenceEl, floatingEl);

      expect(cleanupMap.has(fakeFloatingUiComponent)).toBe(false);
      expect(floatingEl.style.position).toBe("absolute");

      fakeFloatingUiComponent.overlayPositioning = "fixed";
      connectFloatingUI(fakeFloatingUiComponent, referenceEl, floatingEl);

      expect(cleanupMap.has(fakeFloatingUiComponent)).toBe(true);
      expect(floatingEl.style.position).toBe("fixed");
      expect(floatingEl.style.visibility).toBe("hidden");
      expect(floatingEl.style.pointerEvents).toBe("none");

      disconnectFloatingUI(fakeFloatingUiComponent, referenceEl, floatingEl);

      expect(cleanupMap.has(fakeFloatingUiComponent)).toBe(false);
      expect(floatingEl.style.position).toBe("fixed");
    });
  });

  it("debounces positioning per instance", async () => {
    const positionSpy = jest.spyOn(floatingUI, "positionFloatingUI");
    fakeFloatingUiComponent.open = true;

    const anotherFakeFloatingUiComponent = createFakeFloatingUiComponent();
    anotherFakeFloatingUiComponent.open = true;

    floatingUI.reposition(fakeFloatingUiComponent, positionOptions, true);
    expect(positionSpy).toHaveBeenCalledTimes(1);

    floatingUI.reposition(anotherFakeFloatingUiComponent, positionOptions, true);
    expect(positionSpy).toHaveBeenCalledTimes(2);

    await new Promise<void>((resolve) => setTimeout(resolve, repositionDebounceTimeout));
    expect(positionSpy).toHaveBeenCalledTimes(2);
  });
});

it("should have correct value for defaultOffsetDistance", () => {
  expect(defaultOffsetDistance).toBe(6);
});

it("should filter computed placements", () => {
  expect(new Set(filterComputedPlacements([...placements], document.createElement("div")))).toEqual(
    new Set(effectivePlacements)
  );
});