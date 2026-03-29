import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const heart = props => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={800}
    height={800}
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <Path
      fill={props.fill || '#ffffff'}
      fillRule="evenodd"
      d="M5.361 3.47A5.127 5.127 0 0 1 7.5 3c.737 0 1.464.16 2.139.47.674.309 1.28.759 1.785 1.318a.777.777 0 0 0 1.152 0C13.598 3.658 15.006 3 16.5 3c1.493 0 2.902.657 3.924 1.788C21.443 5.915 22 7.424 22 8.979c0 1.555-.557 3.064-1.576 4.192l-6.198 6.858a3 3 0 0 1-4.452 0L3.576 13.17a6.043 6.043 0 0 1-1.17-1.936A6.443 6.443 0 0 1 2 8.98c0-.772.137-1.538.406-2.256a6.044 6.044 0 0 1 1.17-1.935A5.5 5.5 0 0 1 5.361 3.47Z"
      clipRule="evenodd"
    />
  </Svg>
);
export default heart;
