## Live Editing

Like Evan Wallace's [_**How Figma&rsquo;s multiplayer technology works**_][1],
which describes a simplified centralized live editing on tree-based model,
this file describes a simplified centralized live editing on list-based model.
The final code of <samp>@hyrious/telegraph</samp> is a combination of the two.

### Implement

Suppose we have a server that sorts messages and broadcasts them to all clients,
then we can assume that you won't get a message that <q>insert something at
X, where X has not existed yet</q>. Therefore, the implementation is just a
linked list written in a map of `id: {prev, next, value}`.

```ts
// Id only takes 2 bytes if we store them as Int32[2]
type Id = [client: number, clock: number];
type Item<T> = { id: Id; prev: Id | null; next: Id | null; value: T | null };
type List<T> = Record<Id, Item<T>>;
```

For example, below is an example of `"hello"-"world"` list.

| Id  | Prev              | Next              | Value              |
| --- | ----------------- | ----------------- | ------------------ |
| 1-1 | <samp>HEAD</samp> | 2-1               | <samp>hello</samp> |
| 2-1 | 1-1               | <samp>TAIL</samp> | <samp>world</samp> |

An insert operation, <q>insert X right after P</q>, is just modifying the map:

```ts
let list: List<string>;
list.set(X.id, { id: X.id, prev: P.id, next: P.next, value: X.value });
list.set([P.id, "next"], X.id);
```

Delete operation is likewise, <q>remove X</q>:

```ts
list.set([X.prev, "next"], X.next);
list.set([X.next, "prev"], X.prev);
list.delete(X.id);
```

### Operation Queue

Once connected, the client maintains a queue of <q>flying operations</q>,
which are not yet applied in server. The first operation in the queue is
the last-not-synced one.

Once the client receives an operation from the server, it will resort the queue
using the incoming order and, shift out the operations that are <q>grounded</q>.

```ts
let queue: Op[] = []; // local operations that are "flying"
function receive(op: Op) {
  // others operations that happen before the first one
  if (op.id.client !== self.client) {
    apply(op);
    return;
  }
  // self operation that has "grounded"
  if (op.id.clock >= queue[0].id.clock) {
    // some operations are dropped incidentally
    while (op.id.clock > queue[0].id.clock) remove(queue.shift());
    // replace the op with the server one (which is always correct)
    // in case the server decides to do some OT
    replace(queue.shift(), op);
    return;
  }
  // the clock in the queue is always increasing
  // server should never push two operations with incorrect order
  throw new Error("Received an operation that is not in order");
}
```

### Offline Support

Traditional CRDTs store all your operations to make sure all of them will
not be dropped and they will be synced correctly after reconnected. However,
this causes a lot more RAM usage in compared to online (although it won't be
too much). Besides, the final result of merging when reconnected is maybe not
what you expect. Therefore, I decided to use a different approach.

Like [git][3], we fallback to a <q>commit-merge</q> workflow to assist the
user to merge the remote doc with the local one. This way, offline clients
don't have to store anything but the latest doc.

### Caveats

- Centralized.
- The transferred data is not optimized to a smaller size.
- Large amount of data may cause slow response.

### References

- [How Figma&rsquo;s multiplayer technology works][1]
- [Yjs][2]

[1]: https://www.figma.com/blog/how-figmas-multiplayer-technology-works
[2]: https://github.com/yjs/yjs/blob/main/INTERNALS.md
[3]: https://git-scm.com
