export default function decorate(block) {
  const contentWrapper = block.children[0];
  
  if (contentWrapper) {
    const message = contentWrapper.textContent.trim() || 'Hello World';
    
    block.innerHTML = '';
    
    const heading = document.createElement('h2');
    heading.textContent = message;
    
    const subtitle = document.createElement('p');
    subtitle.textContent = '🚀 Componente executado no eds-sandbox';
    
    block.append(heading, subtitle);
  }
}