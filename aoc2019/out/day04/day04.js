"use strict";
let lower = 138241;
let upper = 674034;
let valid_passwords = 0;
for (let candidate = lower; candidate <= upper; candidate++) {
    let monotonic = true;
    let repeated_digits = 0;
    let found_double = false;
    let total = candidate;
    let radix = 100000;
    let prev_digit = -1;
    for (let i = 0; i < 6; i++) {
        let digit = Math.floor(total / radix);
        total -= digit * radix;
        radix /= 10;
        if (prev_digit != -1) {
            if (prev_digit > digit) {
                monotonic = false;
            }
            if (prev_digit == digit) {
                repeated_digits++;
            }
            else {
                if (repeated_digits == 1) {
                    found_double = true;
                }
                repeated_digits = 0;
            }
        }
        prev_digit = digit;
    }
    if ((found_double || repeated_digits == 1) && monotonic) {
        console.log(candidate);
        valid_passwords++;
    }
}
console.log("Valid passwords:", valid_passwords);
//# sourceMappingURL=day04.js.map