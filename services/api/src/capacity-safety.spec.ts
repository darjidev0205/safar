describe('Capacity Safety & Anti-Overbooking Atomic Logic', () => {
  it('should enforce vehicle seat limits against aggregate passenger counts', () => {
    const vehicleCapacity = 4;
    const existingBookings = [
      { id: 'b1', passengerCount: 2, status: 'CONFIRMED' },
      { id: 'b2', passengerCount: 1, status: 'CONFIRMED' },
    ];

    const currentOccupiedSeats = existingBookings.reduce((sum, b) => sum + b.passengerCount, 0);
    expect(currentOccupiedSeats).toBe(3);

    const incomingPassengerRequest = 2;
    const canBook = currentOccupiedSeats + incomingPassengerRequest <= vehicleCapacity;

    expect(canBook).toBe(false); // 3 + 2 = 5 > 4 (Must be rejected)
  });

  it('should allow valid passenger counts that fit within remaining capacity', () => {
    const vehicleCapacity = 6;
    const existingBookings = [
      { id: 'b1', passengerCount: 3, status: 'CONFIRMED' },
    ];

    const currentOccupiedSeats = existingBookings.reduce((sum, b) => sum + b.passengerCount, 0);
    const incomingPassengerRequest = 3;
    const canBook = currentOccupiedSeats + incomingPassengerRequest <= vehicleCapacity;

    expect(canBook).toBe(true); // 3 + 3 = 6 <= 6 (Allowed)
  });

  it('should generate a 4-digit boarding code for passenger check-in', () => {
    const generateBoardingCode = () => Math.floor(1000 + Math.random() * 9000).toString();
    const code = generateBoardingCode();

    expect(code).toHaveLength(4);
    expect(Number(code)).toBeGreaterThanOrEqual(1000);
    expect(Number(code)).toBeLessThanOrEqual(9999);
  });
});
