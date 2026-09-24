/**
 * Rukmini Sarees - Main Interactive Functionality
 * Near Kasturibhai School, Prasadampadu, Vijayawada - 521108
 * Phone / WhatsApp: +91 79816 88516
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Drawer Toggle
  const menuBtn = document.querySelector('.menu-btn');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.drawer-overlay');
  const closeBtn = document.querySelector('.drawer-close');

  function openDrawer() {
    if (drawer) drawer.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  // 2. Active Page Highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.navlinks a, .drawer-links a');

  navLinks.forEach((link) => {
    const linkHref = link.getAttribute('href');
    if (
      linkHref === currentPath ||
      (currentPath === '' && linkHref === 'index.html')
    ) {
      link.classList.add('active');
    }
  });

  // 3. Navbar scroll effect
  const navbar = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 25) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // 4. Copy Address functionality
  const copyBtn = document.getElementById('copyAddressBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const address = 'Near Kasturibhai School, Prasadampadu, Vijayawada - 521108';
      navigator.clipboard.writeText(address).then(() => {
        const origText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied Address!';
        copyBtn.style.background = '#15803d';
        copyBtn.style.color = '#ffffff';
        setTimeout(() => {
          copyBtn.innerHTML = origText;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2200);
      });
    });
  }

  // 5. Interactive WhatsApp Enquiry Form on Contact Page
  const enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('custName')?.value.trim() || 'Valued Customer';
      const phone = document.getElementById('custPhone')?.value.trim() || '';
      const category = document.getElementById('custCategory')?.value || 'General Saree Enquiry';
      const message = document.getElementById('custMessage')?.value.trim() || '';

      const text = 
`✨ *Enquiry from Rukmini Sarees Website* ✨
--------------------------------
*Name:* ${name}
*Phone:* ${phone}
*Requirement:* ${category}
${message ? `*Notes:* ${message}` : ''}
--------------------------------
Hello Rukmini Sarees team, please share catalog and details for this requirement.`;

      const encodedText = encodeURIComponent(text);
      const waUrl = `https://wa.me/917981688516?text=${encodedText}`;

      window.open(waUrl, '_blank');
    });
  }
});
