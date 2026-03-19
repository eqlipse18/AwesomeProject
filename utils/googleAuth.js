import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId:
    '272923477279-vl2sd30rkhioohidpov1h2na6dpsd4tg.apps.googleusercontent.com',
  offlineAccess: true,
});

export const configureGoogleSignIn = () => {};

// export const signInWithGoogle = async () => {
//   try {
//     await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
//     const userInfo = await GoogleSignin.signIn();
//     return {
//       success: true,
//       idToken: userInfo.data?.idToken,
//       user: userInfo.data?.user,
//     };
//   } catch (error) {
//     if (error.code === statusCodes.SIGN_IN_CANCELLED) {
//       return { success: false, error: 'Sign in cancelled' };
//     } else if (error.code === statusCodes.IN_PROGRESS) {
//       return { success: false, error: 'Sign in already in progress' };
//     } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
//       return { success: false, error: 'Play services not available' };
//     }
//     console.log('Google Sign-In Error:', error);
//     return { success: false, error: error.message };
//   }
// };

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    return {
      success: true,
      idToken: userInfo.data?.idToken,
      user: userInfo.data?.user,
    };
  } catch (error) {
    // Full error object log karo
    console.log('Google Sign-In Full Error:', JSON.stringify(error));
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    // ...
  }
};
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
