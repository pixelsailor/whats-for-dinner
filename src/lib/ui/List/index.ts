import List from './List.svelte';
import ListItemRoot from './ListItem.svelte';
import ListItemLink from './ListItemLink.svelte';
import ListItemText from './ListItemText.svelte';
import ListItemSecondaryAction from './ListItemSecondaryAction.svelte';

export const ListItem = {
	Root: ListItemRoot,
	Link: ListItemLink,
	Text: ListItemText,
  SecondaryAction: ListItemSecondaryAction
};

export { List, ListItemRoot, ListItemLink, ListItemText, ListItemSecondaryAction };
