import React, { useState } from 'react';
import Fab from '@mui/material/Fab';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ReplayIcon from '@mui/icons-material/Replay';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import Badge from '@mui/material/Badge';
import { styled } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import geminiModel from './../gemini';
import CircularProgress from '@mui/material/CircularProgress';

const SpeechRecognitionScreen = () => {
  const [transcript, setTranscript] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [continueRecording, setContinueRecording] = useState(false);
  const [firstTime, setFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Generate Report
  const handleGenerateReport = async () => {
    setIsLoading(true);
    const input = transcript.join(' ') + "Generate a sales report with the previous input in html format. Only return the html";
    const result = await geminiModel.generateContent(input);
    const response = await result.response;
    const text = response.text();
    const htmlContent = text.replace(/```html\n|\n```/g, '');
    navigate('report-preview', { state: { htmlContent } });
    setIsLoading(false);
  };

  const startRecording = async (continueRecording = false) => {
    setFirstTime(false);
    setContinueRecording(continueRecording);
    if (Capacitor.platform == 'web') {
      alert('Speech recognition is not available here');
      return;
    }

    const { speechRecognition } = await SpeechRecognition.requestPermissions();
    if (speechRecognition === 'granted') {
      SpeechRecognition.start({
        language: 'en-US',
        maxResults: 2,
        prompt: 'Say something',
        partialResults: true,
        popup: false,
      });
      setIsRecording(true);

      let timeoutId = null;
      if (Capacitor.platform === 'android') {
        // Set a timeout to stop the recording after 5 seconds
        timeoutId = setTimeout(stopRecording, 2 * 1000);
      }

      SpeechRecognition.addListener('partialResults', (data) => {
        if (continueRecording) {
          setCurrentTranscript(data.matches[0]);
        } else {
          setTranscript([data.matches[0]]);
        }

        if (Capacitor.platform === 'android') {
          // If a result is received, clear the timeout and set a new one
          clearTimeout(timeoutId);
          timeoutId = setTimeout(stopRecording, 2 * 1000);
        }

      });
    }
  };
  
  const stopRecording = async () => {

    // Combine the current transcript with the previous ones
    if (continueRecording) {
      setTranscript([...transcript, currentTranscript]);
      setCurrentTranscript('');
      setContinueRecording(false);
    }

    if (Capacitor.platform == 'web') {
      alert('Speech recognition is not available here');
      return;
    }

    SpeechRecognition.removeAllListeners();
    if (Capacitor.platform === 'ios') { // Android stops automatically
      await SpeechRecognition.stop();
    }
    setIsRecording(false);
  };

  const StyledBadge = styled(Badge)(({ theme }) => ({
    '& .MuiBadge-badge': {
      transform: 'scale(1) translate(-20%, -20%)',
    },
  }));

  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      {isLoading ? ( 
          <Box 
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Typography variant="h3" gutterBottom>
            Generating report...
          </Typography>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ p:4 }}>
            <Typography variant="h3" gutterBottom>
              Sales Report Generator
            </Typography>
          </Box>
      
          <Box sx={{ width:'80%', flex: 1 }}>
            <TextareaAutosize
              minRows={10}
              placeholder="Generated text will appear here..."
              style={{ width: '100%', border: 'none'}}
              value={[...transcript, currentTranscript].join(' ')}
            />
          </Box>
      
          <Box sx={{ p:6, position: 'fixed', bottom: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {!isRecording ? (
              <Box display="flex" justifyContent="center" alignItems="center" gap={2} width="100%">
                <Fab color="primary" onClick={() => startRecording(false)}>
                <Box position="relative">
                  <MicIcon/>
                  {!firstTime && (
                    <Badge
                      overlap="circular"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      badgeContent={<ReplayIcon fontSize='big'/>}
                    />
                  )}
                </Box>
                </Fab>
                {transcript[0] && (
                  <Fab style={{ backgroundColor: 'green', color: 'white' }} onClick={() => startRecording(true)}>
                    <Box position="relative">
                      <MicIcon color='inherit'/>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        badgeContent={<PlayArrowIcon fontSize='big' color='inherit'/>}
                      />
                    </Box>
                  </Fab>
                )}
              </Box>
            ) : (
              <Fab color="secondary" onClick={stopRecording}>
                <StopIcon />
              </Fab>
            )}
            <Box width="80%" mt={6}>
              <Button variant="contained" color="primary" onClick={handleGenerateReport} fullWidth>
                Generate Sales Report!
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export default SpeechRecognitionScreen;