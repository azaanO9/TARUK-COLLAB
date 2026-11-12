import test from "node:test";
import assert from "node:assert/strict";
import { isMobilePortraitPhone } from "../ui/mobileDevice.ts";

test("isMobilePortraitPhone blocks only narrow portrait coarse-pointer devices", () => {
  // Phone portrait -> blocked until rotated
  assert.equal(isMobilePortraitPhone(390, 844, true), true);
  assert.equal(isMobilePortraitPhone(375, 667, true), true);

  // Phone landscape -> playable
  assert.equal(isMobilePortraitPhone(844, 390, true), false);
  assert.equal(isMobilePortraitPhone(667, 375, true), false);

  // Portrait tablet -> allowed (shortest side > 600)
  assert.equal(isMobilePortraitPhone(768, 1024, true), false);

  // Desktop fine-pointer narrow window -> allowed
  assert.equal(isMobilePortraitPhone(390, 844, false), false);
  assert.equal(isMobilePortraitPhone(0, 0, true), false);
});

