import postcssGlobalData from '@csstools/postcss-global-data'
import postcssCustomMedia from 'postcss-custom-media'

// Breakpoints de docs/tokens.json como @custom-media (--bp-md, --bp-below-xl …),
// injetados em todo arquivo CSS e expandidos no build. Variáveis CSS não funcionam em media query.
export default {
  plugins: [postcssGlobalData({ files: ['src/ui/styles/media.generated.css'] }), postcssCustomMedia()],
}
