import type { Register } from 'claude-code'

const TINT = '#2a78d61a'

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box borderColor="#ff0000" backgroundColor={TINT}>
        <Text color="red">raw name</Text>
        <Text color="brand">not a theme key</Text>
      </Box>
    )
  })
}
