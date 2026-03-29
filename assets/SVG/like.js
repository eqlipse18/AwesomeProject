import * as React from 'react';
import Svg, { Path } from 'react-native-svg';
const like = props => (
  <Svg
    viewBox="0 0 24 24"
    width={props.width || 24}
    height={props.height || 24}
    fill="none"
    {...props}
  >
    <Path
      fill={props.fill || '#1C274C'}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.106 18.247C5.298 16.083 2 13.542 2 9.137 2 4.274 7.5.825 12 5.501l2 1.998a.75.75 0 0 0 1.06-1.06L13.13 4.506C17.369 1.403 22 4.675 22 9.137c0 4.405-3.298 6.946-6.106 9.11-.292.225-.579.445-.856.664C14 19.729 13 20.5 12 20.5s-2-.77-3.038-1.59c-.277-.218-.564-.438-.856-.663Z"
    />
  </Svg>
);
export default like;
