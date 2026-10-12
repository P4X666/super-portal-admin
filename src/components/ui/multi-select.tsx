"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

interface MultiSelectOption<V extends string> {
  value: V
  label: string
}

interface MultiSelectProps<V extends string> {
  value: V[]
  onValueChange: (value: V[]) => void
  options: readonly MultiSelectOption<V>[]
  placeholder?: React.ReactNode
  disabled?: boolean
  invalid?: boolean
  size?: "sm" | "default"
  className?: string
  "aria-label"?: string
}

/**
 * 多选下拉（下拉形态的多选框，基于 Base UI Menu CheckboxItem）
 * - 点击选项切换勾选且弹层保持打开（MenuCheckboxItem 默认 closeOnClick=false）
 * - trigger 展示选中项中文标签（「、」连接），选项触发 Base UI 键盘导航 / 输入筛选
 * - 样式对齐 select.tsx（trigger 同类名、popup 同宽高变量与动画）
 */
export function MultiSelect<V extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  invalid,
  size = "default",
  className,
  "aria-label": ariaLabel,
}: MultiSelectProps<V>) {
  const toggle = (option: V, checked: boolean) => {
    onValueChange(
      checked
        ? [...value, option]
        : value.filter((v) => v !== option),
    )
  }

  const labels = value
    .map((v) => options.find((option) => option.value === v)?.label)
    .filter((label): label is string => label !== undefined)

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        data-slot="multi-select-trigger"
        data-size={size}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        className={cn(
          "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center text-left">
          {labels.length > 0 ? (
            <span className="truncate">{labels.join("、")}</span>
          ) : (
            <span className="truncate text-text-placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="start" sideOffset={4} className="isolate z-50">
          <MenuPrimitive.Popup
            data-slot="multi-select-content"
            className="relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            {options.map((option) => {
              const checked = value.includes(option.value)
              return (
                <MenuPrimitive.CheckboxItem
                  key={option.value}
                  label={option.label}
                  checked={checked}
                  onCheckedChange={(next) => toggle(option.value, next)}
                  className={cn(
                    "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                  )}
                >
                  <span className="flex-1 whitespace-nowrap">{option.label}</span>
                  <MenuPrimitive.CheckboxItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon />
                  </MenuPrimitive.CheckboxItemIndicator>
                </MenuPrimitive.CheckboxItem>
              )
            })}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  )
}
