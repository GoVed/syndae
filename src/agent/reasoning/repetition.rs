//! Repetition detection and response stream arresting logic.

/// Detects runaway degenerative repetition loops (e.g. model repeating the same sentence or phrase 3+ times).
/// Returns Some(cutoff_index) if repetition is detected, where cutoff_index is the end of the first occurrence.
pub fn find_repetition_cutoff(text: &str) -> Option<usize> {
    let n = text.len();
    if n < 50 {
        return None;
    }

    // 1. Line-based repetition check: scan non-empty trimmed lines
    let non_empty_lines: Vec<(usize, &str)> = text
        .match_indices('\n')
        .chain(std::iter::once((text.len(), "")))
        .scan(0usize, |start, (end, _)| {
            let line = text.get(*start..end).unwrap_or("");
            let res = (*start, line.trim());
            *start = (end + 1).min(text.len());
            Some(res)
        })
        .filter(|(_, line)| line.len() >= 10)
        .collect();

    if non_empty_lines.len() >= 3 {
        let len = non_empty_lines.len();
        let l3 = non_empty_lines[len - 1].1;
        let l2 = non_empty_lines[len - 2].1;
        let (l1_idx, l1) = non_empty_lines[len - 3];
        if l1 == l2 && l2 == l3 {
            return Some(l1_idx + l1.len());
        }
    }

    // 2. Large chunk dual-repetition check (length 50 to 1000): 2 consecutive identical occurrences
    let max_large_pat = (n / 2).min(1000);
    for pat_len in 50..=max_large_pat {
        let p2_start = n - pat_len;
        let p1_start = n - 2 * pat_len;

        if let (Some(p2), Some(p1)) = (text.get(p2_start..n), text.get(p1_start..p2_start)) {
            if p1.trim() == p2.trim() && p1.trim().len() >= 50 {
                return Some(p1_start + p1.trim_end().len());
            }
        }
    }

    // 3. Medium chunk triple-repetition check (length 15 to 1000): 3 consecutive identical occurrences
    let max_pat_len = (n / 3).min(1000);
    for pat_len in 15..=max_pat_len {
        let p3_start = n - pat_len;
        let p2_start = n - 2 * pat_len;
        let p1_start = n - 3 * pat_len;

        if let (Some(p3), Some(p2), Some(p1)) = (
            text.get(p3_start..n),
            text.get(p2_start..p3_start),
            text.get(p1_start..p2_start),
        ) {
            if p1.trim() == p2.trim() && p2.trim() == p3.trim() && p1.trim().len() >= 10 {
                return Some(p1_start + p1.trim_end().len());
            }
        }
    }

    None
}

/// Truncates repeated patterns and halts streaming when a repetition loop is detected.
/// Used for thought streams or general text.
pub fn arrest_repetition(current: &mut String, accumulated: &mut String) -> bool {
    if current.len() >= 50
        && (current.ends_with('\n')
            || current.ends_with('.')
            || current.ends_with('!')
            || current.ends_with('>'))
    {
        if let Some(cutoff) = find_repetition_cutoff(current) {
            let discarded = current.len().saturating_sub(cutoff);
            current.truncate(cutoff);
            if accumulated.len() >= discarded {
                let new_len = accumulated.len() - discarded;
                accumulated.truncate(new_len);
            }
            return true;
        }
    }
    false
}

/// Specialized stream arrest for assistant response text.
/// Enforces terminal tags (<title>), arrests duplicate <options> containers, and halts degenerative pattern loops.
pub fn arrest_response_repetition(current: &mut String, accumulated: &mut String) -> bool {
    let lower = current.to_lowercase();

    // 1. Terminal title tag check: if a title closing tag exists, the turn is finalized.
    let title_tags = ["</title>", "</suggested_title>", "</session_title>"];
    for tag in &title_tags {
        if let Some(pos) = lower.find(tag) {
            let title_end = pos + tag.len();
            if current.len() > title_end {
                let discarded = current.len() - title_end;
                current.truncate(title_end);
                if accumulated.len() >= discarded {
                    let new_len = accumulated.len() - discarded;
                    accumulated.truncate(new_len);
                }
                return true;
            } else if lower.ends_with(tag) {
                return true;
            }
        }
    }

    // 2. Duplicate <options> container check: only one <options> block is permitted per turn.
    if let Some(close_idx) = lower.find("</options>") {
        let after_idx = close_idx + "</options>".len();
        let after_text = &lower[after_idx..];
        if after_text.contains("<options") || after_text.contains("<option") {
            let discarded = current.len() - after_idx;
            current.truncate(after_idx);
            if accumulated.len() >= discarded {
                let new_len = accumulated.len() - discarded;
                accumulated.truncate(new_len);
            }
            return true;
        }
    }

    // 3. Fallback pattern repetition detector
    if current.len() >= 50
        && (current.ends_with('\n')
            || current.ends_with('.')
            || current.ends_with('!')
            || current.ends_with('>')
            || current.ends_with(' '))
    {
        if let Some(cutoff) = find_repetition_cutoff(current) {
            let discarded = current.len().saturating_sub(cutoff);
            current.truncate(cutoff);
            if accumulated.len() >= discarded {
                let new_len = accumulated.len() - discarded;
                accumulated.truncate(new_len);
            }
            return true;
        }
    }

    false
}
