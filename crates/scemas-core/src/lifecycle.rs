// server lifecycle state machine
//
// models the runtime phases of the SCEMAS platform.
// DataDistributionManager is the only controller whose state diagram
// has a termination path (Error → [*]), so the drain cascade
// is coordinated through the distribution layer.
//
// overall lifecycle: [*] → INIT → AUTH → DIST → DRAIN → SHUT → [*]
//
// draining sub-sequence (cascading):
//   StopIngestion → DrainAPIRequests → DrainOperatorViews → StopMonitoring

use std::sync::Arc;
use std::sync::atomic::{AtomicU8, AtomicU32, Ordering};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ServerPhase {
    Initializing = 0,
    Authenticating = 1,
    Distributing = 2,
    Draining = 3,
    ShuttingDown = 4,
    Stopped = 5,
}

impl ServerPhase {
    fn from_u8(value: u8) -> Self {
        match value {
            0 => Self::Initializing,
            1 => Self::Authenticating,
            2 => Self::Distributing,
            3 => Self::Draining,
            4 => Self::ShuttingDown,
            5 => Self::Stopped,
            _ => Self::Stopped,
        }
    }

    pub fn is_accepting_requests(self) -> bool {
        matches!(self, Self::Distributing)
    }

    pub fn is_accepting_ingestion(self) -> bool {
        matches!(self, Self::Distributing)
    }

    pub fn is_draining(self) -> bool {
        matches!(self, Self::Draining)
    }
}

impl std::fmt::Display for ServerPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Initializing => write!(f, "initializing"),
            Self::Authenticating => write!(f, "authenticating"),
            Self::Distributing => write!(f, "distributing"),
            Self::Draining => write!(f, "draining"),
            Self::ShuttingDown => write!(f, "shutting_down"),
            Self::Stopped => write!(f, "stopped"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum DrainStage {
    NotDraining = 0,
    StopIngestion = 1,
    DrainAPIRequests = 2,
    DrainOperatorViews = 3,
    StopMonitoring = 4,
    Complete = 5,
}

impl std::fmt::Display for DrainStage {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotDraining => write!(f, "not_draining"),
            Self::StopIngestion => write!(f, "stop_ingestion"),
            Self::DrainAPIRequests => write!(f, "drain_api_requests"),
            Self::DrainOperatorViews => write!(f, "drain_operator_views"),
            Self::StopMonitoring => write!(f, "stop_monitoring"),
            Self::Complete => write!(f, "complete"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct LifecycleState {
    phase: Arc<AtomicU8>,
    drain_stage: Arc<AtomicU8>,
    inflight: Arc<AtomicU32>,
}

impl Default for LifecycleState {
    fn default() -> Self {
        Self::new()
    }
}

impl LifecycleState {
    pub fn new() -> Self {
        Self {
            phase: Arc::new(AtomicU8::new(ServerPhase::Initializing as u8)),
            drain_stage: Arc::new(AtomicU8::new(0)),
            inflight: Arc::new(AtomicU32::new(0)),
        }
    }

    pub fn phase(&self) -> ServerPhase {
        ServerPhase::from_u8(self.phase.load(Ordering::Acquire))
    }

    pub fn drain_stage(&self) -> DrainStage {
        match self.drain_stage.load(Ordering::Acquire) {
            0 => DrainStage::NotDraining,
            1 => DrainStage::StopIngestion,
            2 => DrainStage::DrainAPIRequests,
            3 => DrainStage::DrainOperatorViews,
            4 => DrainStage::StopMonitoring,
            _ => DrainStage::Complete,
        }
    }

    pub fn set_phase(&self, phase: ServerPhase) {
        self.phase.store(phase as u8, Ordering::Release);
    }

    pub fn advance_drain(&self, stage: DrainStage) {
        self.drain_stage.store(stage as u8, Ordering::Release);
    }

    pub fn track_request(&self) {
        self.inflight.fetch_add(1, Ordering::AcqRel);
    }

    pub fn release_request(&self) {
        self.inflight.fetch_sub(1, Ordering::AcqRel);
    }

    pub fn inflight_count(&self) -> u32 {
        self.inflight.load(Ordering::Acquire)
    }
}
