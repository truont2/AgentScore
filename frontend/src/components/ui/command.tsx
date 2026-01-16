
import * as React from "react"

const Command = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
Command.displayName = "Command"

const CommandDialog = () => null
const CommandInput = () => null
const CommandList = () => null
const CommandEmpty = () => null
const CommandGroup = () => null
const CommandItem = () => null
const CommandShortcut = () => null
const CommandSeparator = () => null

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
