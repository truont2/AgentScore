
import * as React from "react"

export type CalendarProps = React.HTMLAttributes<HTMLDivElement>

function Calendar({ className, ...props }: CalendarProps) {
  return <div className={className} {...props} />
}
Calendar.displayName = "Calendar"

export { Calendar }
