import { ChartCard } from "@/components/dashboard/ChartCard";
import { Meter } from "@/components/dashboard/Meter";

export function WardOccupancyCard({ wards }) {
  const occupied = wards.reduce((total, ward) => total + ward.occupied, 0);
  const capacity = wards.reduce((total, ward) => total + ward.capacity, 0);

  return (
    <ChartCard
      title="Bed occupancy"
      description={`${occupied} of ${capacity} beds occupied`}
      contentClassName="grid gap-4"
    >
      {wards.map((ward) => (
        <Meter key={ward.ward} label={ward.ward} value={ward.occupied} max={ward.capacity} />
      ))}
    </ChartCard>
  );
}
