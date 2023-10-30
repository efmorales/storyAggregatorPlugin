import { Plugin, TFile, Notice } from 'obsidian';
import moment from 'moment';

export default class StoryAggregatorPlugin extends Plugin {
  async onload() {
    this.app.vault.on('modify', debounce(this.handleFileChange.bind(this), 500));
  }

  async handleFileChange(file: TFile) {
    const today = moment().format("YYYY-MM-DD");
    const dailyNotePath = today + '.md';
  
    if (file.path !== dailyNotePath) {
      return;
    }
  
    this.handleDailyUpdate();
  }

  async handleDailyUpdate() {
    const today = moment().format("YYYY-MM-DD");
    const dailyNote = this.app.vault.getAbstractFileByPath(today + '.md');

    if (!(dailyNote instanceof TFile)) {
      new Notice('No daily note detected');
      return;
    }

    if (dailyNote instanceof TFile) {
      let content = await this.app.vault.read(dailyNote);
      let story = this.extractStory(content);

      if (story) {
        this.updateAggregateNote(today, story);
      }
    }
  }

  extractStory(noteContent) {
    const match = noteContent.match(/## 5 minute story\n([^#]+)/);
    return match ? match[1].trim() : null;
  }

  async updateAggregateNote(date, story) {
    const aggregateNotePath = 'All 5 Minute Stories.md';
    let aggregateNote = this.app.vault.getAbstractFileByPath(aggregateNotePath);

    if (!(aggregateNote instanceof TFile)) {
      aggregateNote = await this.app.vault.create(aggregateNotePath, ''); // Create new note if doesn't exist
    }

    let aggregateContent = await this.app.vault.read(aggregateNote);
    const storyIndex = aggregateContent.indexOf(`| [${date}](${date}) |`);

    if (storyIndex !== -1) {
      const endOfStoryIndex = aggregateContent.indexOf('\n', storyIndex);
      if (endOfStoryIndex !== -1) {
        aggregateContent = aggregateContent.slice(0, storyIndex) + aggregateContent.slice(endOfStoryIndex + 1);
      } else {
        aggregateContent = aggregateContent.slice(0, storyIndex);
      }
    }

    if (aggregateContent !== '' && !aggregateContent.endsWith('\n')) {
      aggregateContent += '\n';
    }
    aggregateContent += `| [${date}](${date}) | ${story.replace(/\n/g, ' ')} |`;

    await this.app.vault.modify(aggregateNote, aggregateContent);
  }
}

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}