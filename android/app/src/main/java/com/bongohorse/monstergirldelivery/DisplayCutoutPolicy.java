package com.bongohorse.monstergirldelivery;

import android.os.Build;
import android.view.Window;
import android.view.WindowManager;

final class DisplayCutoutPolicy {
    private DisplayCutoutPolicy() {}

    static int modeForSdk(int sdkInt) {
        if (sdkInt >= Build.VERSION_CODES.R) {
            return WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }
        if (sdkInt >= Build.VERSION_CODES.P) {
            return WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        return WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
    }

    static void apply(Window window, int sdkInt) {
        if (sdkInt < Build.VERSION_CODES.P) {
            return;
        }

        WindowManager.LayoutParams attributes = window.getAttributes();
        int requestedMode = modeForSdk(sdkInt);
        if (attributes.layoutInDisplayCutoutMode == requestedMode) {
            return;
        }

        attributes.layoutInDisplayCutoutMode = requestedMode;
        window.setAttributes(attributes);
    }
}
