import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PickupService } from '../../services/pickup.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  user: any;
  stats: any = {};
  pickups: any[] = [];
  chatMessages: any[] = [];
  chatDraft = '';
  chatError = '';
  analysisSections: any[] = [];
  summaryCards: any[] = [
    {
      label: 'Open requests',
      value: '12',
      caption: 'Awaiting volunteer action',
      icon: 'fa-clipboard-list',
      tone: 'amber'
    },
    {
      label: 'Accepted today',
      value: '7',
      caption: 'Pickups in motion',
      icon: 'fa-truck-fast',
      tone: 'blue'
    },
    {
      label: 'Completed',
      value: '42',
      caption: 'This month',
      icon: 'fa-circle-check',
      tone: ''
    },
    {
      label: 'Recovered',
      value: '128kg',
      caption: 'Estimated recyclable material',
      icon: 'fa-scale-balanced',
      tone: 'slate'
    }
  ];
  activityFeed = [
    {
      title: 'Plastic pickup requested',
      detail: 'Resident added a pickup with two sorted bags and access notes.',
      time: '10 min',
      tone: 'amber'
    },
    {
      title: 'Volunteer accepted e-waste route',
      detail: 'Collection assigned and visible on the pickup board.',
      time: '42 min',
      tone: 'blue'
    },
    {
      title: 'Paper collection completed',
      detail: 'Status closed and impact estimate added to the monthly total.',
      time: '2 hr',
      tone: ''
    }
  ];
  nextAction = {
    title: 'Keep the queue moving',
    description: 'Review open requests and update anything that has changed so residents can track progress.',
    label: 'Open pickup board',
    link: '/pickups',
    icon: 'fa-arrow-right'
  };
  impactNote = 'Your workspace is ready for pickup scheduling and volunteer coordination.';

  constructor(
    private authService: AuthService,
    private pickupService: PickupService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.user = this.authService.getUser();
    this.loadProfile();
  }

  loadProfile() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile.user || profile;
        this.configureForRole();
      },
      error: (error) => {
        console.error('Error loading profile:', error);
      }
    });
    this.configureForRole();
    this.loadPickups();
    this.loadChat();
  }

  getFirstName(): string {
    return this.user?.fullName?.split(' ')[0] || 'there';
  }

  configureForRole() {
    const role = this.user?.role;

    if (role === 'user') {
      this.nextAction = {
        title: 'Schedule your next pickup',
        description: 'Create a request with the material type, preferred date, and exact pickup address.',
        label: 'Request pickup',
        link: '/create-pickup',
        icon: 'fa-plus'
      };
      this.impactNote = 'Sorted requests help volunteers pick the right route and recycling stream.';
    } else if (role === 'volunteer') {
      this.nextAction = {
        title: 'Find a nearby request',
        description: 'Accept a pending pickup and keep the status updated when collection is complete.',
        label: 'Find pickups',
        link: '/pickups',
        icon: 'fa-location-dot'
      };
      this.impactNote = 'Accepted requests make the resident view feel reliable and transparent.';
    } else if (role === 'admin') {
      this.nextAction = {
        title: 'Review platform flow',
        description: 'Check request volume, pending pickups, and completed activity across the city.',
        label: 'Review board',
        link: '/pickups',
        icon: 'fa-chart-simple'
      };
      this.impactNote = 'Admin visibility keeps pickup operations balanced across volunteers.';
    }

    this.buildAnalytics();
  }

  loadPickups() {
    this.pickupService.getPickups().subscribe({
      next: (pickups) => {
        this.pickups = pickups;
        this.buildAnalytics();
      },
      error: (error) => {
        console.error('Error loading pickup analytics:', error);
      }
    });
  }

  loadChat() {
    this.chatService.getMessages().subscribe({
      next: (messages) => {
        this.chatMessages = messages;
      },
      error: (error) => {
        console.error('Error loading chat:', error);
      }
    });
  }

  sendChatMessage() {
    const message = this.chatDraft.trim();
    if (!message) {
      return;
    }

    this.chatService.sendMessage(message).subscribe({
      next: () => {
        this.chatDraft = '';
        this.chatError = '';
        this.loadChat();
      },
      error: (error) => {
        this.chatError = error.error?.message || error.message || 'Unable to send message';
      }
    });
  }

  isOwnMessage(message: any): boolean {
    return message.senderId === this.user?._id;
  }

  getMessageTime(message: any): string {
    if (!message.createdAt) {
      return '';
    }

    return new Date(message.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  buildAnalytics() {
    const total = this.pickups.length;
    const pending = this.pickups.filter((pickup) => pickup.status === 'pending').length;
    const accepted = this.pickups.filter((pickup) => pickup.status === 'accepted' || pickup.status === 'in-progress').length;
    const completed = this.pickups.filter((pickup) => pickup.status === 'completed').length;
    const reports = this.pickups.reduce((sum, pickup) => sum + (pickup.reports?.length || 0), 0);
    const points = this.user?.points || completed * 25;

    this.summaryCards = [
      {
        label: 'Total pickups',
        value: total,
        caption: 'Visible in your role workspace',
        icon: 'fa-clipboard-list',
        tone: 'amber'
      },
      {
        label: 'In progress',
        value: accepted,
        caption: 'Accepted or actively moving',
        icon: 'fa-truck-fast',
        tone: 'blue'
      },
      {
        label: 'Completed',
        value: completed,
        caption: 'Closed recycling work',
        icon: 'fa-circle-check',
        tone: ''
      },
      {
        label: this.user?.role === 'volunteer' ? 'Volunteer points' : 'Reports',
        value: this.user?.role === 'volunteer' ? points : reports,
        caption: this.user?.role === 'volunteer' ? '25 points per completed pickup' : 'Issues needing attention',
        icon: this.user?.role === 'volunteer' ? 'fa-star' : 'fa-flag',
        tone: 'slate'
      }
    ];

    this.analysisSections = [
      {
        role: 'Admin',
        icon: 'fa-user-shield',
        title: 'Operations analysis',
        metric: `${pending} pending`,
        detail: `${reports} report${reports === 1 ? '' : 's'} open across the board.`
      },
      {
        role: 'User',
        icon: 'fa-house',
        title: 'Resident analysis',
        metric: `${completed} completed`,
        detail: 'Track requested pickups, reports, and volunteer coordination from one place.'
      },
      {
        role: 'Volunteer',
        icon: 'fa-handshake-angle',
        title: 'Volunteer analysis',
        metric: `${points} points`,
        detail: 'Volunteers earn 25 points whenever an assigned pickup is completed.'
      }
    ];

    this.activityFeed = this.pickups.slice(0, 5).map((pickup) => ({
      title: `${pickup.wasteType || 'Waste'} pickup ${pickup.status}`,
      detail: pickup.pickupAddress || pickup.description || 'Pickup activity updated.',
      time: pickup.preferredDate ? new Date(pickup.preferredDate).toLocaleDateString() : 'Now',
      tone: pickup.status === 'pending' ? 'amber' : pickup.status === 'completed' ? '' : 'blue'
    }));

    if (this.activityFeed.length === 0) {
      this.activityFeed = [
        {
          title: 'No pickup activity yet',
          detail: 'Create or accept a pickup to start building analytics.',
          time: 'Now',
          tone: 'amber'
        }
      ];
    }
  }
}
