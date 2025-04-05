import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { getBookDetails, getComments, postComment } from '../services/api';

export default function BookViewScreen() {
  const [book, setBook] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState(null);
  const bookId = 1;
  const groupId = 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const bookData = await getBookDetails(bookId);
        setBook(bookData);

        const commentData = await getComments(bookId, groupId);
        setComments(commentData);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePost = async () => {
    try {
      setError(null);
      await postComment(bookId, groupId, newComment);
      setNewComment('');
      const updatedComments = await getComments(bookId, groupId);
      setComments(updatedComments);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View>
      {error ? <Text style={{ color: 'red' }}>Error: {error}</Text> : null}
      <Text>{book?.title || 'Loading...'}</Text>
      <Text>Group Comments:</Text>
      {comments.map((c, i) => <Text key={i}>{c.message}</Text>)}
      <TextInput value={newComment} onChangeText={setNewComment} placeholder="Add a comment" />
      <Button title="Post" onPress={handlePost} />
    </View>
  );
}