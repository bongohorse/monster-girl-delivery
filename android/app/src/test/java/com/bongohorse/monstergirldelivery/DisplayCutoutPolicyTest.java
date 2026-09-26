package com.bongohorse.monstergirldelivery;

import static org.junit.Assert.assertEquals;

import android.view.WindowManager;

import org.junit.Test;

public class DisplayCutoutPolicyTest {
    @Test
    public void preservesDefaultModeBeforeAndroidPie() {
        assertEquals(
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT,
            DisplayCutoutPolicy.modeForSdk(27)
        );
    }

    @Test
    public void usesShortEdgesOnAndroidPieAndTen() {
        assertEquals(
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            DisplayCutoutPolicy.modeForSdk(28)
        );
        assertEquals(
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
            DisplayCutoutPolicy.modeForSdk(29)
        );
    }

    @Test
    public void usesAlwaysFromAndroidElevenOnward() {
        assertEquals(
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS,
            DisplayCutoutPolicy.modeForSdk(30)
        );
        assertEquals(
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS,
            DisplayCutoutPolicy.modeForSdk(36)
        );
    }
}
