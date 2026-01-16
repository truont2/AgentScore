
import * as React from "react"

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: any
    children: React.ReactNode
  }
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>
    {children}
  </div>
))
ChartContainer.displayName = "Chart"

const ChartTooltip = () => null
const ChartTooltipContent = () => null
const ChartLegend = () => null
const ChartLegendContent = () => null
const ChartStyle = () => null

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
