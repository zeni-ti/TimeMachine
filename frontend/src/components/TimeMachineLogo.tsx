import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

export function TimeMachineLogo({ size = 188 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Time Machine clock and globe logo">
      <Defs>
        <ClipPath id="clockGlobeBadge"><Circle cx="60" cy="60" r="39" /></ClipPath>
      </Defs>
      <Rect x="1" y="1" width="118" height="118" rx="27" fill="#1E2B58" />
      <G clipPath="url(#clockGlobeBadge)">
        <Rect x="20" y="20" width="80" height="40" fill="#FFFFFF" />
        <Rect x="20" y="60" width="80" height="40" fill="#3898EC" />
        <Ellipse cx="60" cy="80" rx="22" ry="37" fill="none" stroke="#55ACEE" strokeWidth="1.5" opacity="0.9" />
        <Line x1="22" y1="80" x2="98" y2="80" stroke="#55ACEE" strokeWidth="1.5" opacity="0.9" />
        <Path d="M39 73l6-4 4 2 2 6-5 3-2 6-5-2-3-5 3-6zm22 8 4-3 5 2 2 5-4 2-1 5-5-2-3-5 2-4zm16-14 4-2 5 3 1 5-4 2-3-3-5-1 2-4z" fill="#2B78C5" />
      </G>
      <Circle cx="60" cy="60" r="39" fill="none" stroke="#D8E2EB" strokeWidth="2" />
      <G stroke="#273653" strokeWidth="2.4" strokeLinecap="round">
        <Line x1="60" y1="25" x2="60" y2="31" />
        <Line x1="43" y1="30" x2="46" y2="35" />
        <Line x1="31" y1="43" x2="36" y2="46" />
        <Line x1="77" y1="30" x2="74" y2="35" />
        <Line x1="89" y1="43" x2="84" y2="46" />
      </G>
      <Line x1="60" y1="60" x2="45" y2="45" stroke="#273653" strokeWidth="4" strokeLinecap="round" />
      <Circle cx="60" cy="60" r="3.5" fill="#273653" />
      <G transform="translate(76 45) rotate(45)">
        <Path d="M0-17 4-3 13 4 13 7 4 5 3 13 6 16 6 18 0 16 -6 18 -6 16 -3 13 -4 5 -13 7 -13 4 -4-3Z" fill="#D8E2EB" />
        <Path d="M-13 4-4 1-3 4-11 7ZM13 4 4 1 3 4 11 7ZM-4 12 0 10 4 12 3 15 0 14-3 15Z" fill="#55ACEE" />
      </G>
    </Svg>
  );
}
