import { Plugin, TFile, Notice } from 'obsidian';
import moment from 'moment';

export default class StoryAggregatorPlugin extends Plugin {
  async onload() {
    this.app.workspace.onLayoutReady(this.handleDailyUpdate.bind(this));
    // Setup next trigger for 24 hours later
    setTimeout(() => this.handleDailyUpdate(), 24 * 60 * 60 * 1000);

    // Add a command that can be triggered anywhere
    this.addCommand({
      id: 'run-aggregator',
      name: 'Run Story Aggregator',
      callback: () => {
        this.handleDailyUpdate();
      }
    });

    // Add a ribbon icon that triggers the aggregator when clicked
    const ribbonIconEl = this.addRibbonIcon('dice', 'Run Story Aggregator', (evt: MouseEvent) => {
      this.handleDailyUpdate();
    });

    this.app.vault.on('modify', debounce(this.handleFileChange.bind(this), 500));

  }

  async handleFileChange(file: TFile) {
    const today = moment().format("YYYY-MM-DD");
    const dailyNotePath = today + '.md';

    if (file.path === dailyNotePath) {
      this.handleDailyUpdate();
    }
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

    // Setup next trigger for 24 hours later
    setTimeout(() => this.handleDailyUpdate(), 24 * 60 * 60 * 1000);
  }

  extractStory(noteContent) {
    // Extract the story based on "## 5 minute story" heading
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
      // If the story already exists, remove it
      const endOfStoryIndex = aggregateContent.indexOf('\n', storyIndex);
      if (endOfStoryIndex !== -1) {
        // If the story ends with a newline, remove it along with the story
        aggregateContent = aggregateContent.slice(0, storyIndex) + aggregateContent.slice(endOfStoryIndex + 1);
      } else {
        // If the story is the last line in the file, just remove the story
        aggregateContent = aggregateContent.slice(0, storyIndex);
      }
    }
  
    // Add the updated story
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