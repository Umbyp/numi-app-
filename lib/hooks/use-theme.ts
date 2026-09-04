import { useColorScheme } from 'react-native';
import { colors } from '../theme';

export function useTheme() {
  const scheme = useColorScheme();
  return colors[scheme === 'dark' ? 'dark' : 'light'];
}
