import type { Register } from 'claude-code'

// Svg-only colors: listed and approved in exceptions.json.
const ICON = { light: '#184f95', dark: '#6da7ec' }

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box, Text, Svg } = $.ui.resolve(e)
    return (
      <Box borderStyle="round" borderColor="warning">
        <Text color="success">ok</Text>
        <Text dimColor>quiet</Text>
        <Svg source={`<svg><path fill="${ICON.light}"/></svg>`} alt="icon" />
      </Box>
    )
  })
}
