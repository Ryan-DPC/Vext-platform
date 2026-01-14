use crate::network_client::{GameClient, GameEvent};
use std::collections::HashMap;

pub struct NetworkManager {
    pub client: Option<GameClient>,
}

impl NetworkManager {
    pub fn new() -> Self {
        Self { client: None }
    }

    pub fn poll(&mut self) -> Vec<GameEvent> {
        if let Some(client) = &mut self.client {
            client.poll_updates()
        } else {
            Vec::new()
        }
    }
}
