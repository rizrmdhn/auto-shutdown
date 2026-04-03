package monitor

import (
  "time"

  "github.com/shirou/gopsutil/v3/disk"
  "github.com/shirou/gopsutil/v3/net"
)

type Metrics struct {
  NetworkKbps float64
  DiskMBps    float64
  Timestamp   time.Time
}

type Monitor struct {
  prevNetBytes uint64
  prevDiskIO   uint64
}

func New() *Monitor {
  return &Monitor{}
}

func (m *Monitor) Sample() (*Metrics, error) {
  // Network
  netStats, err := net.IOCounters(false)
  if err != nil {
    return nil, err
  }
  totalBytes := uint64(0)
  for _, s := range netStats {
    totalBytes += s.BytesRecv + s.BytesSent
  }

  // Disk
  diskStats, err := disk.IOCounters()
  if err != nil {
    return nil, err
  }
  totalDisk := uint64(0)
  for _, s := range diskStats {
    totalDisk += s.ReadBytes + s.WriteBytes
  }

  netKbps := float64(totalBytes-m.prevNetBytes) / 1024
  diskMBps := float64(totalDisk-m.prevDiskIO) / 1024 / 1024

  m.prevNetBytes = totalBytes
  m.prevDiskIO = totalDisk

  return &Metrics{
    NetworkKbps: netKbps,
    DiskMBps:    diskMBps,
    Timestamp:   time.Now(),
  }, nil
}
