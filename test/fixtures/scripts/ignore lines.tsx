// The "tsx" loader removes type annotations
export type NamesProps = { names?: string[] }

export const NamesComponent = (props: NamesProps) => {
  // The "?." operator will be transformed for ES6
  const names = props.names?.join(' ')

  // The "tsx" loader transforms JSX syntax into JS
  return <div>Names: {names}</div>
}
