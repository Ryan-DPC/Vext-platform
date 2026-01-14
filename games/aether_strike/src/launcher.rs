use crate::menu_ui::PlayerProfile;

pub struct LauncherConfig {
    pub username: String,
    pub token: String,
}

pub fn parse_launch_args() -> (LauncherConfig, PlayerProfile) {
    let args: Vec<String> = std::env::args().collect();
    let mut vext_username = "GuestPlayer".to_string();
    let mut vext_token = String::new();
    let mut friends_to_add = Vec::new();

    for i in 0..args.len() {
        if args[i] == "--vext-user-id" && i + 1 < args.len() {
            vext_username = args[i + 1].clone();
        }
        if args[i] == "--vext-token" && i + 1 < args.len() {
            vext_token = args[i + 1].clone();
        }
        if args[i] == "--vext-friends" && i + 1 < args.len() {
            let friends_str = &args[i + 1];
            let friends_list: Vec<&str> = friends_str.split(',').collect();
            for friend_entry in friends_list {
                let parts: Vec<&str> = friend_entry.split(':').collect();
                if parts.len() >= 2 {
                    let name = parts[0].to_string();
                    let is_online = parts[1] == "online";
                    friends_to_add.push((name, is_online));
                }
            }
        }
    }

    let mut profile = PlayerProfile::new(vext_username.clone());
    for (name, online) in friends_to_add {
        profile.add_friend(&name, online);
    }

    (
        LauncherConfig {
            username: vext_username,
            token: vext_token,
        },
        profile
    )
}
