"use client"

import * as React from "react"
import { Tabs } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function TabsRoot({ className, ...props }: React.ComponentProps<typeof Tabs.Root>) {
  return (
    <Tabs.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof Tabs.List>) {
  return (
    <Tabs.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted/50 text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg border p-1",
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Tabs.Tab>) {
  return (
    <Tabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        "data-[selected]:bg-background data-[selected]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof Tabs.Panel>) {
  return (
    <Tabs.Panel
      data-slot="tabs-panel"
      className={cn("focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none", className)}
      {...props}
    />
  )
}

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent }
