'use client'

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible'

const Collapsible = ({ ...props }: CollapsiblePrimitive.Root.Props) => {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

const CollapsibleTrigger = ({ ...props }: CollapsiblePrimitive.Trigger.Props) => {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
}

const CollapsibleContent = ({ ...props }: CollapsiblePrimitive.Panel.Props) => {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
