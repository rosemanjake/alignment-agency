import React, { useEffect, useMemo } from 'react';
import { useGameState } from '../context/GameStateProvider';
import styles from '../styles/Info.module.css';

const START_DATE_ISO = '2037-06-14';

export default function Info() {
  const { performanceSummaries, weekNumber, setWeekNumber, isMobile } =
    useGameState();

  useEffect(() => {
    const computedWeek = performanceSummaries.length + 1;
    if (computedWeek !== weekNumber) {
      setWeekNumber(computedWeek);
    }
  }, [performanceSummaries.length, weekNumber, setWeekNumber]);

  const formattedDate = useMemo(
    () => calculateWeekDate(START_DATE_ISO, weekNumber),
    [weekNumber]
  );

  if (isMobile) {
    return <div style={{ height: '20px' }} />;
  }

  return (
    <>
      <div className={styles.row}>
        <div className={styles.item}>SYS MONITOR</div>
        <div className={styles.item} style={{ textAlign: 'center' }}>
          MAGNET_OS v7.3.1
        </div>
        <div className={styles.item} style={{ textAlign: 'right' }}>
          {`Week ${weekNumber} - ${formattedDate}`}
        </div>
      </div>
      <div className={`${styles.secondRow} ${styles.row}`}>
        <div className={styles.item}>UPLINK ACTIVE</div>
        <div className={styles.highlightItem} style={{ textAlign: 'center' }}>
          SYSTEM ONLINE
        </div>
        <div className={styles.item} style={{ textAlign: 'right' }}>
          2.0 76162
        </div>
      </div>
    </>
  );
}

function calculateWeekDate(baseDateIso: string, weekNumber: number): string {
  const date = new Date(baseDateIso);
  const weekOffset = Math.max(0, weekNumber - 1);
  date.setDate(date.getDate() + weekOffset * 7);
  return date.toISOString().split('T')[0];
}
