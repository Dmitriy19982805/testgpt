import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Ingredient, Settings } from "../../db/types";
import { formatCurrency } from "../../utils/currency";
import { getIngredientUnitPrice, getUnitLabel } from "./recipeUtils";

interface IngredientSelectProps {
  ingredients: Ingredient[];
  selectedIngredientId: string;
  query: string;
  currency: Settings["currency"];
  excludedIngredientIds: Set<string>;
  onQueryChange: (value: string) => void;
  onSelect: (ingredient: Ingredient) => void;
  onDuplicateAttempt: () => void;
  onInteract: () => void;
}

const MENU_OFFSET = 6;
const VIEWPORT_PADDING = 12;
const MAX_RESULTS = 8;

export function IngredientSelect({
  ingredients,
  selectedIngredientId,
  query,
  currency,
  excludedIngredientIds,
  onQueryChange,
  onSelect,
  onDuplicateAttempt,
  onInteract,
}: IngredientSelectProps) {
  const [localQuery, setLocalQuery] = useState(query);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const normalizedQuery = localQuery.trim().toLowerCase();

  const filteredIngredients = useMemo(() => {
    if (normalizedQuery.length < 1) {
      return [];
    }
    return ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(normalizedQuery)).slice(0, MAX_RESULTS);
  }, [ingredients, normalizedQuery]);

  const shouldShowDropdown = isOpen && normalizedQuery.length >= 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const nextIndex = filteredIngredients.findIndex((ingredient) => ingredient.id === selectedIngredientId);
    setHighlightedIndex(nextIndex >= 0 ? nextIndex : filteredIngredients.length > 0 ? 0 : -1);
  }, [isOpen, filteredIngredients, selectedIngredientId]);

  const updatePosition = () => {
    const input = inputRef.current;
    const menu = menuRef.current;
    if (!input || !menu) {
      return;
    }
    const rect = input.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;

    const bottomTop = rect.bottom + MENU_OFFSET;
    const topTop = rect.top - menuHeight - MENU_OFFSET;
    let top = bottomTop;
    if (bottomTop + menuHeight > window.innerHeight - VIEWPORT_PADDING && topTop > VIEWPORT_PADDING) {
      top = topTop;
    }

    const maxTop = window.innerHeight - menuHeight - VIEWPORT_PADDING;

    setPosition({
      top: Math.min(Math.max(top, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, maxTop)),
      left: Math.min(Math.max(rect.left, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, window.innerWidth - rect.width - VIEWPORT_PADDING)),
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!shouldShowDropdown) {
      return;
    }
    updatePosition();
  }, [shouldShowDropdown, localQuery, filteredIngredients.length]);

  useEffect(() => {
    if (!shouldShowDropdown) {
      return;
    }
    const handleUpdate = () => updatePosition();
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (wrapperRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
    };
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [shouldShowDropdown]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const selectIngredient = (ingredient: Ingredient) => {
    const isDisabled = excludedIngredientIds.has(ingredient.id) && ingredient.id !== selectedIngredientId;
    if (isDisabled) {
      onDuplicateAttempt();
      return;
    }
    onSelect(ingredient);
    setLocalQuery(ingredient.name);
    onQueryChange(ingredient.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="text-xs text-slate-500">Ингредиент</label>
      <input
        ref={inputRef}
        value={localQuery}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setLocalQuery(nextQuery);
          onQueryChange(nextQuery);
          setIsOpen(true);
          onInteract();
        }}
        onFocus={() => {
          if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
          }
          setIsOpen(true);
          onInteract();
        }}
        onBlur={() => {
          closeTimeoutRef.current = window.setTimeout(() => {
            setIsOpen(false);
            setHighlightedIndex(-1);
          }, 150);
        }}
        onKeyDown={(event) => {
          if (!shouldShowDropdown && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            setIsOpen(true);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (filteredIngredients.length === 0) {
              return;
            }
            setHighlightedIndex((prev) => (prev + 1 >= filteredIngredients.length ? 0 : prev + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (filteredIngredients.length === 0) {
              return;
            }
            setHighlightedIndex((prev) => (prev <= 0 ? filteredIngredients.length - 1 : prev - 1));
          } else if (event.key === "Enter") {
            if (!shouldShowDropdown) {
              return;
            }
            event.preventDefault();
            const ingredient = highlightedIndex >= 0 ? filteredIngredients[highlightedIndex] : filteredIngredients[0];
            if (ingredient) {
              selectIngredient(ingredient);
            }
          } else if (event.key === "Escape") {
            setIsOpen(false);
            setHighlightedIndex(-1);
          }
        }}
        placeholder="Найти и выбрать ингредиент"
        className="flex h-11 w-full rounded-2xl border border-slate-200/70 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />

      {shouldShowDropdown
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[10000] max-h-[240px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.2)]"
            >
              {ingredients.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No ingredients yet. Add them in Ingredients section.</p>
              ) : filteredIngredients.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No matches</p>
              ) : (
                filteredIngredients.map((ingredient, index) => {
                  const category = ingredient.category?.trim();
                  const isDisabled = excludedIngredientIds.has(ingredient.id) && ingredient.id !== selectedIngredientId;
                  const isHighlighted = highlightedIndex === index;
                  return (
                    <button
                      type="button"
                      key={ingredient.id}
                      className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDisabled}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectIngredient(ingredient)}
                      style={isHighlighted ? { backgroundColor: "rgb(241 245 249)" } : undefined}
                    >
                      <p className="text-sm text-slate-800">
                        {ingredient.name}
                        {category ? ` — ${category}` : ""}
                      </p>
                      <p className="text-xs text-slate-500">Цена: {formatCurrency(getIngredientUnitPrice(ingredient), currency)} / {getUnitLabel(ingredient.baseUnit)}</p>
                    </button>
                  );
                })
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
