import { IsNumber, IsOptional, Max, Min } from 'class-validator';

// Unlike GpsEventDto (check-in/check-out), GPS here is optional — attendance is a lightweight
// day marker, not a field visit, and shouldn't be blocked by a denied location permission. There
// is no separate device/server timestamp pair either (unlike CheckIn/CheckOut) — the Attendance
// model has a single checkTime column, which the service always sets from the server's own clock,
// so there's nothing here for the client to submit or for a device-clock mismatch to distort.
export class MarkAttendanceDto {
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
