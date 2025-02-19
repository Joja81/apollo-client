import gql from "graphql-tag";
import { InMemoryCache } from "../../../cache/inmemory/inMemoryCache";
import { MockSubscriptionLink, wait } from "../../../testing/core";
import { GraphQLError } from "graphql";
import { ObservableStream } from "../../../testing/internal";
import { ApolloError } from "../../../errors";
import { ApolloClient } from "../../ApolloClient";
import { NetworkStatus } from "../../networkStatus";

describe("mutiple results", () => {
  it("allows multiple query results from link", async () => {
    const query = gql`
      query LazyLoadLuke {
        people_one(id: 1) {
          name
          friends @defer {
            name
          }
        }
      }
    `;

    const initialData = {
      people_one: {
        name: "Luke Skywalker",
        friends: null,
      },
    };

    const laterData = {
      people_one: {
        // XXX true defer's wouldn't send this
        name: "Luke Skywalker",
        friends: [{ name: "Leia Skywalker" }],
      },
    };
    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    const observable = client.watchQuery({
      query,
      variables: {},
    });
    const stream = new ObservableStream(observable);

    // fire off first result
    link.simulateResult({ result: { data: initialData } });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });

    link.simulateResult({ result: { data: laterData } });

    await expect(stream).toEmitApolloQueryResult({
      data: laterData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });
  });

  it("allows multiple query results from link with ignored errors", async () => {
    const query = gql`
      query LazyLoadLuke {
        people_one(id: 1) {
          name
          friends @defer {
            name
          }
        }
      }
    `;

    const initialData = {
      people_one: {
        name: "Luke Skywalker",
        friends: null,
      },
    };

    const laterData = {
      people_one: {
        // XXX true defer's wouldn't send this
        name: "Luke Skywalker",
        friends: [{ name: "Leia Skywalker" }],
      },
    };
    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    const observable = client.watchQuery({
      query,
      variables: {},
      errorPolicy: "ignore",
    });
    const stream = new ObservableStream(observable);

    // fire off first result
    link.simulateResult({ result: { data: initialData } });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });

    link.simulateResult({
      result: { errors: [new GraphQLError("defer failed")] },
    });

    await expect(stream).toEmitApolloQueryResult({
      data: undefined,
      loading: false,
      networkStatus: 7,
      partial: true,
    });

    await wait(20);
    link.simulateResult({ result: { data: laterData } });

    await expect(stream).toEmitApolloQueryResult({
      data: laterData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });
  });

  it("strips errors from a result if ignored", async () => {
    const query = gql`
      query LazyLoadLuke {
        people_one(id: 1) {
          name
          friends @defer {
            name
          }
        }
      }
    `;

    const initialData = {
      people_one: {
        name: "Luke Skywalker",
        friends: null,
      },
    };

    const laterData = {
      people_one: {
        // XXX true defer's wouldn't send this
        name: "Luke Skywalker",
        friends: [{ name: "Leia Skywalker" }],
      },
    };
    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    const observable = client.watchQuery({
      query,
      variables: {},
      errorPolicy: "ignore",
    });
    const stream = new ObservableStream(observable);

    // fire off first result
    link.simulateResult({ result: { data: initialData } });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });

    // this should fire the `next` event without this error
    link.simulateResult({
      result: {
        errors: [new GraphQLError("defer failed")],
        data: laterData,
      },
    });

    await expect(stream).toEmitApolloQueryResult({
      data: laterData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });
  });

  it.skip("allows multiple query results from link with all errors", async () => {
    const query = gql`
      query LazyLoadLuke {
        people_one(id: 1) {
          name
          friends @defer {
            name
          }
        }
      }
    `;

    const initialData = {
      people_one: {
        name: "Luke Skywalker",
        friends: null,
      },
    };

    const laterData = {
      people_one: {
        // XXX true defer's wouldn't send this
        name: "Luke Skywalker",
        friends: [{ name: "Leia Skywalker" }],
      },
    };
    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    const observable = client.watchQuery({
      query,
      variables: {},
      errorPolicy: "all",
    });
    const stream = new ObservableStream(observable);

    // fire off first result
    link.simulateResult({ result: { data: initialData } });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });

    // this should fire the next event again
    link.simulateResult({
      error: new Error("defer failed"),
    });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      loading: false,
      networkStatus: 7,
      errors: [new Error("defer failed")],
      partial: false,
    });

    link.simulateResult({ result: { data: laterData } });

    await expect(stream).toEmitApolloQueryResult({
      data: laterData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });
  });

  it("emits error if an error is set with the none policy", async () => {
    const query = gql`
      query LazyLoadLuke {
        people_one(id: 1) {
          name
          friends @defer {
            name
          }
        }
      }
    `;

    const initialData = {
      people_one: {
        name: "Luke Skywalker",
        friends: null,
      },
    };

    const link = new MockSubscriptionLink();
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link,
    });

    const observable = client.watchQuery({
      query,
      variables: {},
      // errorPolicy: 'none', // this is the default
    });
    const stream = new ObservableStream(observable);

    let count = 0;
    observable.subscribe({
      next: (result) => {
        // errors should never be passed since they are ignored
        count++;
        if (count === 1) {
          expect(result.errors).toBeUndefined();
        }
        if (count === 2) {
          expect(result.error).toBeDefined();
        }
      },
    });

    // fire off first result
    link.simulateResult({ result: { data: initialData } });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      loading: false,
      networkStatus: 7,
      partial: false,
    });

    link.simulateResult({ error: new Error("defer failed") });

    await expect(stream).toEmitApolloQueryResult({
      data: initialData,
      error: new ApolloError({ networkError: new Error("defer failed") }),
      errors: [],
      loading: false,
      networkStatus: NetworkStatus.error,
      partial: false,
    });

    await expect(stream).not.toEmitAnything();
  });
});
