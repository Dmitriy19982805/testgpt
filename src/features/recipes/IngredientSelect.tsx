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
  onTouched: () => void;
  onNavigateToIngredients: () => void;
}

const MENU_OFFSET = 6;
const VIEWPORT_PADDING = 12;

export function IngredientSelect({
  ingredients,
  selectedIngredientId,
  query,
  currency,
  excludedIngredientIds,
  onQueryChange,
  onSelect,
  onDuplicateAttempt,
  onTouched,
  onNavigateToIngredients,
}: IngredientSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filteredIngredients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return ingredients;
    }
    return ingredients.filter((ingredient) => {
      const category = ingredient.category?.trim().toLowerCase() ?? "";
      return ingredient.name.toLowerCase().includes(normalizedQuery) || category.includes(normalizedQuery);
    });
  }, [ingredients, query]);

  const updatePosition = () => {
    const wrapper = wrapperRef.current;
    const menu = menuRef.current;
    if (!wrapper || !menu) {
      return;
    }
    const rect = wrapper.getBoundingClientRect();
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
    if (!open) {
      return;
    }
    updatePosition();
  }, [open, query, filteredIngredients.length]);

  useEffect(() => {
    if (!open) {
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
      setOpen(false);
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
  }, [open]);

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="text-xs text-slate-500">Ингредиент</label>
      <input
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onTouched}
        placeholder="Найти и выбрать ингредиент"
        className="flex h-11 w-full rounded-2xl border border-slate-200/70 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
      />

      {open
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[220] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.2)]"
            >
              {ingredients.length === 0 ? (
                <div className="space-y-3 p-3 text-sm">
                  <p className="text-slate-600">Ингредиентов пока нет. Добавьте их в разделе «Ингредиенты».</p>
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-700 underline underline-offset-2"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      onNavigateToIngredients();
                    }}
                  >
                    Перейти в ингредиенты
                  </button>
                </div>
              ) : filteredIngredients.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Ничего не найдено.</p>
              ) : (
                filteredIngredients.map((ingredient) => {
                  const category = ingredient.category?.trim();
                  const isDisabled = excludedIngredientIds.has(ingredient.id) && ingredient.id !== selectedIngredientId;
                  return (
                    <button
                      type="button"
                      key={ingredient.id}
                      className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDisabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (isDisabled) {
                          onDuplicateAttempt();
                          return;
                        }
                        onSelect(ingredient);
                        setOpen(false);
                      }}
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
