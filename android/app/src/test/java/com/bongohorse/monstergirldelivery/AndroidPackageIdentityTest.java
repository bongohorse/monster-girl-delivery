package com.bongohorse.monstergirldelivery;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class AndroidPackageIdentityTest {
    @Test
    public void packageIdentityRemainsStable() {
        assertEquals("com.bongohorse.monstergirldelivery", BuildConfig.APPLICATION_ID);
    }
}
