import { AnnouncementsService } from '../services/announcements.js';
export declare const ANNOUNCEMENTS_QUERY_KEY: string[];
export declare function useAnnouncements(
  service: AnnouncementsService,
  schoolId?: string | null
):
  | {
      createAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        import('@educonnect/shared').Announcement,
        Error,
        {
          title: string;
          visibility: 'school' | 'class' | 'public' | 'private';
          content: string;
          targetClasses: string[];
        },
        unknown
      >;
      isCreating: boolean;
      deleteAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        unknown,
        Error,
        string,
        any
      >;
      isDeleting: boolean;
      data: import('@educonnect/shared').Announcement[];
      error: Error;
      isError: true;
      isPending: false;
      isLoading: false;
      isLoadingError: false;
      isRefetchError: true;
      isSuccess: false;
      isPlaceholderData: false;
      status: 'error';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      failureCount: number;
      failureReason: Error | null;
      errorUpdateCount: number;
      isFetched: boolean;
      isFetchedAfterMount: boolean;
      isFetching: boolean;
      isInitialLoading: boolean;
      isPaused: boolean;
      isRefetching: boolean;
      isStale: boolean;
      isEnabled: boolean;
      refetch: (
        options?: import('@tanstack/react-query').RefetchOptions
      ) => Promise<
        import('@tanstack/react-query').QueryObserverResult<
          import('@educonnect/shared').Announcement[],
          Error
        >
      >;
      fetchStatus: import('@tanstack/react-query').FetchStatus;
      promise: Promise<import('@educonnect/shared').Announcement[]>;
    }
  | {
      createAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        import('@educonnect/shared').Announcement,
        Error,
        {
          title: string;
          visibility: 'school' | 'class' | 'public' | 'private';
          content: string;
          targetClasses: string[];
        },
        unknown
      >;
      isCreating: boolean;
      deleteAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        unknown,
        Error,
        string,
        any
      >;
      isDeleting: boolean;
      data: import('@educonnect/shared').Announcement[];
      error: null;
      isError: false;
      isPending: false;
      isLoading: false;
      isLoadingError: false;
      isRefetchError: false;
      isSuccess: true;
      isPlaceholderData: false;
      status: 'success';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      failureCount: number;
      failureReason: Error | null;
      errorUpdateCount: number;
      isFetched: boolean;
      isFetchedAfterMount: boolean;
      isFetching: boolean;
      isInitialLoading: boolean;
      isPaused: boolean;
      isRefetching: boolean;
      isStale: boolean;
      isEnabled: boolean;
      refetch: (
        options?: import('@tanstack/react-query').RefetchOptions
      ) => Promise<
        import('@tanstack/react-query').QueryObserverResult<
          import('@educonnect/shared').Announcement[],
          Error
        >
      >;
      fetchStatus: import('@tanstack/react-query').FetchStatus;
      promise: Promise<import('@educonnect/shared').Announcement[]>;
    }
  | {
      createAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        import('@educonnect/shared').Announcement,
        Error,
        {
          title: string;
          visibility: 'school' | 'class' | 'public' | 'private';
          content: string;
          targetClasses: string[];
        },
        unknown
      >;
      isCreating: boolean;
      deleteAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        unknown,
        Error,
        string,
        any
      >;
      isDeleting: boolean;
      data: undefined;
      error: Error;
      isError: true;
      isPending: false;
      isLoading: false;
      isLoadingError: true;
      isRefetchError: false;
      isSuccess: false;
      isPlaceholderData: false;
      status: 'error';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      failureCount: number;
      failureReason: Error | null;
      errorUpdateCount: number;
      isFetched: boolean;
      isFetchedAfterMount: boolean;
      isFetching: boolean;
      isInitialLoading: boolean;
      isPaused: boolean;
      isRefetching: boolean;
      isStale: boolean;
      isEnabled: boolean;
      refetch: (
        options?: import('@tanstack/react-query').RefetchOptions
      ) => Promise<
        import('@tanstack/react-query').QueryObserverResult<
          import('@educonnect/shared').Announcement[],
          Error
        >
      >;
      fetchStatus: import('@tanstack/react-query').FetchStatus;
      promise: Promise<import('@educonnect/shared').Announcement[]>;
    }
  | {
      createAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        import('@educonnect/shared').Announcement,
        Error,
        {
          title: string;
          visibility: 'school' | 'class' | 'public' | 'private';
          content: string;
          targetClasses: string[];
        },
        unknown
      >;
      isCreating: boolean;
      deleteAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        unknown,
        Error,
        string,
        any
      >;
      isDeleting: boolean;
      data: undefined;
      error: null;
      isError: false;
      isPending: true;
      isLoading: true;
      isLoadingError: false;
      isRefetchError: false;
      isSuccess: false;
      isPlaceholderData: false;
      status: 'pending';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      failureCount: number;
      failureReason: Error | null;
      errorUpdateCount: number;
      isFetched: boolean;
      isFetchedAfterMount: boolean;
      isFetching: boolean;
      isInitialLoading: boolean;
      isPaused: boolean;
      isRefetching: boolean;
      isStale: boolean;
      isEnabled: boolean;
      refetch: (
        options?: import('@tanstack/react-query').RefetchOptions
      ) => Promise<
        import('@tanstack/react-query').QueryObserverResult<
          import('@educonnect/shared').Announcement[],
          Error
        >
      >;
      fetchStatus: import('@tanstack/react-query').FetchStatus;
      promise: Promise<import('@educonnect/shared').Announcement[]>;
    }
  | {
      createAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        import('@educonnect/shared').Announcement,
        Error,
        {
          title: string;
          visibility: 'school' | 'class' | 'public' | 'private';
          content: string;
          targetClasses: string[];
        },
        unknown
      >;
      isCreating: boolean;
      deleteAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        unknown,
        Error,
        string,
        any
      >;
      isDeleting: boolean;
      data: undefined;
      error: null;
      isError: false;
      isPending: true;
      isLoadingError: false;
      isRefetchError: false;
      isSuccess: false;
      isPlaceholderData: false;
      status: 'pending';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      failureCount: number;
      failureReason: Error | null;
      errorUpdateCount: number;
      isFetched: boolean;
      isFetchedAfterMount: boolean;
      isFetching: boolean;
      isLoading: boolean;
      isInitialLoading: boolean;
      isPaused: boolean;
      isRefetching: boolean;
      isStale: boolean;
      isEnabled: boolean;
      refetch: (
        options?: import('@tanstack/react-query').RefetchOptions
      ) => Promise<
        import('@tanstack/react-query').QueryObserverResult<
          import('@educonnect/shared').Announcement[],
          Error
        >
      >;
      fetchStatus: import('@tanstack/react-query').FetchStatus;
      promise: Promise<import('@educonnect/shared').Announcement[]>;
    }
  | {
      createAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        import('@educonnect/shared').Announcement,
        Error,
        {
          title: string;
          visibility: 'school' | 'class' | 'public' | 'private';
          content: string;
          targetClasses: string[];
        },
        unknown
      >;
      isCreating: boolean;
      deleteAnnouncement: import('@tanstack/react-query').UseMutateAsyncFunction<
        unknown,
        Error,
        string,
        any
      >;
      isDeleting: boolean;
      data: import('@educonnect/shared').Announcement[];
      isError: false;
      error: null;
      isPending: false;
      isLoading: false;
      isLoadingError: false;
      isRefetchError: false;
      isSuccess: true;
      isPlaceholderData: true;
      status: 'success';
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      failureCount: number;
      failureReason: Error | null;
      errorUpdateCount: number;
      isFetched: boolean;
      isFetchedAfterMount: boolean;
      isFetching: boolean;
      isInitialLoading: boolean;
      isPaused: boolean;
      isRefetching: boolean;
      isStale: boolean;
      isEnabled: boolean;
      refetch: (
        options?: import('@tanstack/react-query').RefetchOptions
      ) => Promise<
        import('@tanstack/react-query').QueryObserverResult<
          import('@educonnect/shared').Announcement[],
          Error
        >
      >;
      fetchStatus: import('@tanstack/react-query').FetchStatus;
      promise: Promise<import('@educonnect/shared').Announcement[]>;
    };
