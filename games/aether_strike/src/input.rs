use macroquad::prelude::*;

/// Gérer l'input de texte
pub fn handle_text_input(text: &mut String, max_len: usize) {
    let keys_pressed = get_keys_pressed();
    for key in keys_pressed {
        match key {
            KeyCode::Backspace => {
                text.pop();
            }
            KeyCode::Space => {
                if text.len() < max_len {
                    text.push(' ');
                }
            }
            _ => {
                if let Some(c) = key_to_char(key) {
                    if text.len() < max_len {
                        text.push(c);
                    }
                }
            }
        }
    }
}

/// Convertir une touche en caractère
pub fn key_to_char(key: KeyCode) -> Option<char> {
    match key {
        KeyCode::A => Some('a'),
        KeyCode::B => Some('b'),
        KeyCode::C => Some('c'),
        KeyCode::D => Some('d'),
        KeyCode::E => Some('e'),
        KeyCode::F => Some('f'),
        KeyCode::G => Some('g'),
        KeyCode::H => Some('h'),
        KeyCode::I => Some('i'),
        KeyCode::J => Some('j'),
        KeyCode::K => Some('k'),
        KeyCode::L => Some('l'),
        KeyCode::M => Some('m'),
        KeyCode::N => Some('n'),
        KeyCode::O => Some('o'),
        KeyCode::P => Some('p'),
        KeyCode::Q => Some('q'),
        KeyCode::R => Some('r'),
        KeyCode::S => Some('s'),
        KeyCode::T => Some('t'),
        KeyCode::U => Some('u'),
        KeyCode::V => Some('v'),
        KeyCode::W => Some('w'),
        KeyCode::X => Some('x'),
        KeyCode::Y => Some('y'),
        KeyCode::Z => Some('z'),
        KeyCode::Key0 => Some('0'),
        KeyCode::Key1 => Some('1'),
        KeyCode::Key2 => Some('2'),
        KeyCode::Key3 => Some('3'),
        KeyCode::Key4 => Some('4'),
        KeyCode::Key5 => Some('5'),
        KeyCode::Key6 => Some('6'),
        KeyCode::Key7 => Some('7'),
        KeyCode::Key8 => Some('8'),
        KeyCode::Key9 => Some('9'),
        _ => None,
    }
}
